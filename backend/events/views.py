import hashlib
import hmac
import json
import uuid
import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import F
from django.core.mail import send_mail
from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from twilio.rest import Client
from .models import Event, TicketType, Attendee, Ticket, CheckIn
from .serializers import (
    EventSerializer,
    TicketSerializer,
    CheckInSerializer,
    AttendeeSerializer,
    TicketPurchaseSerializer,
)

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _coerce_ticket_types(self, data):
        ticket_types = data.get("ticket_types")
        if isinstance(ticket_types, str):
            try:
                parsed = json.loads(ticket_types)
            except json.JSONDecodeError:
                return data
            mutable = data.copy()
            mutable["ticket_types"] = parsed
            return mutable
        return data

    def create(self, request, *args, **kwargs):
        data = self._coerce_ticket_types(request.data)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        data = self._coerce_ticket_types(request.data)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def get_serializer_class(self):
        return EventSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAdminUser()]

class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer

    def get_permissions(self):
        if self.action in ["initialize_payment", "verify_payment"]:
            return [AllowAny()]
        if self.action in ["verify", "list", "retrieve", "resend_code"]:
            return [IsAdminUser()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminUser()]
        return [IsAdminUser()]

    def get_queryset(self):
        queryset = Ticket.objects.all().order_by("-created_at")
        event_id = self.request.query_params.get("event")
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    @action(detail=False, methods=['post'], url_path="initialize-payment")
    def initialize_payment(self, request):
        serializer = TicketPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            event = Event.objects.get(id=data["event"])
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            ticket_type = TicketType.objects.get(id=data["ticket_type"], event=event)
        except TicketType.DoesNotExist:
            return Response({"error": "Ticket type not found"}, status=status.HTTP_404_NOT_FOUND)

        if ticket_type.sold_count + data.get("quantity", 1) > ticket_type.limit:
            return Response({"error": "Not enough tickets available"}, status=status.HTTP_400_BAD_REQUEST)

        # Handle User creation/linking for the login feature
        user, created = User.objects.get_or_create(
            email=data["email"],
            defaults={
                "username": data["email"],
                "first_name": data["full_name"].split(" ")[0],
                "last_name": " ".join(data["full_name"].split(" ")[1:]),
            }
        )

        attendee = Attendee.objects.create(
            user=user,
            full_name=data["full_name"],
            email=data["email"],
            age=data["age"],
            phone=data["phone"],
            picture=data.get("picture"),
        )

        payment_ref = f"PSK-{uuid.uuid4().hex[:12].upper()}"
        quantity = data.get("quantity", 1)
        tickets = []
        for _ in range(quantity):
            tickets.append(Ticket(
                event=event,
                ticket_type=ticket_type,
                attendee=attendee,
                status="pending",
                payment_ref=payment_ref,
            ))
        Ticket.objects.bulk_create(tickets)

        if float(ticket_type.price) <= 0:
            _finalize_ticket_payment(payment_ref, notify=True)
            saved_tickets = Ticket.objects.filter(payment_ref=payment_ref)
            return Response({"status": "paid", "tickets": TicketSerializer(saved_tickets, many=True).data})

        total_amount = float(ticket_type.price) * quantity
        paystack = _initialize_paystack_payment(
            email=data["email"],
            amount=total_amount,
            reference=payment_ref,
        )
        if not paystack["ok"]:
            Ticket.objects.filter(payment_ref=payment_ref).delete()
            attendee.delete()
            return Response({"error": "Payment initialization failed"}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            "status": "pending",
            "authorization_url": paystack["authorization_url"],
            "reference": payment_ref,
        })

    @action(detail=False, methods=['post'], url_path="verify-payment")
    def verify_payment(self, request):
        reference = request.data.get("reference")
        if not reference:
            return Response({"error": "reference is required"}, status=status.HTTP_400_BAD_REQUEST)

        verified = _verify_paystack_payment(reference)
        if not verified["ok"]:
            return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ticket = Ticket.objects.get(payment_ref=reference)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

        _finalize_ticket_payment(reference, notify=True)
        tickets = Ticket.objects.filter(payment_ref=reference)
        return Response({"status": "paid", "tickets": TicketSerializer(tickets, many=True).data})

    @action(detail=False, methods=['get'])
    def verify(self, request):
        code = request.query_params.get('code')
        event_id = request.query_params.get('eventId')
        if not code or not event_id:
            return Response({'error': 'Code and eventId are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            ticket = Ticket.objects.get(code=code, event_id=event_id)
            if ticket.status == "pending":
                return Response({'error': 'Ticket not paid'}, status=status.HTTP_400_BAD_REQUEST)
            if ticket.status == "cancelled":
                return Response({'error': 'Ticket cancelled'}, status=status.HTTP_400_BAD_REQUEST)
            serializer = self.get_serializer(ticket)
            return Response(serializer.data)
        except Ticket.DoesNotExist:
            return Response({'error': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["post"], url_path="resend-code")
    def resend_code(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status != "paid" or not ticket.code:
            return Response({"error": "Ticket not paid or code missing"}, status=status.HTTP_400_BAD_REQUEST)
        _send_ticket_email(ticket)
        return Response({"status": "queued"})

class CheckInViewSet(viewsets.ModelViewSet):
    queryset = CheckIn.objects.all()
    serializer_class = CheckInSerializer

    def get_permissions(self):
        return [IsAdminUser()]

    def create(self, request, *args, **kwargs):
        ticket_id = request.data.get("ticket")
        if not ticket_id:
            return Response({"error": "ticket is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

        if ticket.status == "checked_in":
            return Response({"error": "Already checked in"}, status=status.HTTP_400_BAD_REQUEST)
        if ticket.status != "paid":
            return Response({"error": "Ticket not paid"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        ticket.status = "checked_in"
        ticket.save(update_fields=["status"])

        return Response(serializer.data, status=status.HTTP_201_CREATED)

class AttendeeViewSet(viewsets.ModelViewSet):
    queryset = Attendee.objects.all()
    serializer_class = AttendeeSerializer

    def get_permissions(self):
        return [IsAdminUser()]


def _initialize_paystack_payment(email, amount, reference):
    if not settings.PAYSTACK_SECRET_KEY:
        return {"ok": False}
    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "email": email,
        "amount": int(amount * 100),
        "reference": reference,
    }
    if settings.PAYSTACK_CALLBACK_URL:
        payload["callback_url"] = settings.PAYSTACK_CALLBACK_URL
    response = requests.post("https://api.paystack.co/transaction/initialize", headers=headers, json=payload, timeout=20)
    if response.status_code != 200:
        return {"ok": False}
    data = response.json()
    if not data.get("status"):
        return {"ok": False}
    return {"ok": True, "authorization_url": data["data"]["authorization_url"]}


def _verify_paystack_payment(reference):
    if not settings.PAYSTACK_SECRET_KEY:
        return {"ok": False}
    headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
    response = requests.get(f"https://api.paystack.co/transaction/verify/{reference}", headers=headers, timeout=20)
    if response.status_code != 200:
        return {"ok": False}
    data = response.json()
    if not data.get("status") or data.get("data", {}).get("status") != "success":
        return {"ok": False}
    return {"ok": True, "payload": data["data"]}


def _finalize_ticket_payment(reference, notify=False):
    with transaction.atomic():
        tickets = Ticket.objects.select_for_update().filter(payment_ref=reference)
        if not tickets.exists() or tickets[0].status == "paid":
            return
            
        ticket_type = TicketType.objects.select_for_update().get(id=tickets[0].ticket_type_id)
        quantity = tickets.count()
        
        if ticket_type.sold_count + quantity > ticket_type.limit:
            for ticket in tickets:
                ticket.status = "cancelled"
                ticket.save()
            return
            
        for ticket in tickets:
            ticket.status = "paid"
            ticket.save()
            
        ticket_type.sold_count = F("sold_count") + quantity
        ticket_type.save(update_fields=["sold_count"])
    
    if notify:
        _send_ticket_email(tickets)


def _send_ticket_email(tickets):
    if not settings.EMAIL_HOST_USER:
        return None
    
    main_ticket = tickets.first()
    if not main_ticket:
        return None
        
    codes = ", ".join([t.code for t in tickets if t.code])
    
    subject = f"Your Tickets for {main_ticket.event.title}"
    message = f"Hello {main_ticket.attendee.full_name},\n\nYour tickets for {main_ticket.event.title} have been confirmed!\n\nTicket Codes: {codes}\nVenue: {main_ticket.event.venue}\nDate: {main_ticket.event.date_time}\n\nShow these codes or the QR codes at the entrance.\n\nEnjoy the event!"
    recipient_list = [main_ticket.attendee.email]
    
    try:
        return send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipient_list)
    except Exception as e:
        print(f"Email sending failed: {e}")
        return None


@api_view(["POST"])
@permission_classes([AllowAny])
def paystack_webhook(request):
    signature = request.headers.get("x-paystack-signature", "")
    secret = settings.PAYSTACK_WEBHOOK_SECRET or settings.PAYSTACK_SECRET_KEY
    if not secret:
        return Response({"error": "Webhook secret not configured"}, status=status.HTTP_400_BAD_REQUEST)
    computed = hmac.new(secret.encode(), request.body, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(computed, signature):
        return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    payload = json.loads(request.body.decode("utf-8"))
    if payload.get("event") == "charge.success":
        reference = payload.get("data", {}).get("reference")
        if reference:
            _finalize_ticket_payment(reference, notify=True)
    return Response({"status": "ok"})
