from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import Event, TicketType, Ticket, Attendee


class TicketingFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin",
            password="password123",
            is_staff=True,
            is_superuser=True,
        )
        self.event = Event.objects.create(
            title="Test Event",
            date_time="Jan 1, 2026",
            venue="Test Venue",
            description="Test",
            status="published",
        )
        self.ticket_type_free = TicketType.objects.create(
            event=self.event,
            name="Free",
            price=0,
            limit=10,
            sold_count=0,
        )

    def test_initialize_payment_free_ticket(self):
        payload = {
            "event": str(self.event.id),
            "ticket_type": str(self.ticket_type_free.id),
            "full_name": "Jane Doe",
            "email": "jane@example.com",
            "age": 28,
            "phone": "+15551234567",
        }
        response = self.client.post("/api/tickets/initialize-payment/", payload, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "paid")
        self.ticket_type_free.refresh_from_db()
        self.assertEqual(self.ticket_type_free.sold_count, 1)

    def test_check_in_updates_ticket_status(self):
        attendee = Attendee.objects.create(
            full_name="John Doe",
            email="john@example.com",
            age=30,
            phone="+15551234567",
        )
        ticket = Ticket.objects.create(
            event=self.event,
            ticket_type=self.ticket_type_free,
            attendee=attendee,
            status="paid",
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post("/api/check-ins/", {"ticket": str(ticket.id), "checked_in_by": "admin"})
        self.assertEqual(response.status_code, 201)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "checked_in")
