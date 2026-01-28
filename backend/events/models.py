from django.db import models
from django.contrib.auth.models import User
import uuid

class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    date_time = models.CharField(max_length=100)  # Keeping it as char for now to match frontend wireframe format
    venue = models.CharField(max_length=255)
    description = models.TextField()
    flyer = models.ImageField(upload_to='flyers/', null=True, blank=True)
    status = models.CharField(max_length=50, default='published')

    def __str__(self):
        return self.title

class TicketType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, related_name='ticket_types', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    limit = models.IntegerField()
    sold_count = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.event.title} - {self.name}"

class Attendee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='attendee_profile', null=True, blank=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    age = models.IntegerField()
    phone = models.CharField(max_length=20)
    picture = models.ImageField(upload_to='attendees/', null=True, blank=True)

    def __str__(self):
        return self.full_name

class Ticket(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('checked_in', 'Checked In'),
        ('cancelled', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    ticket_type = models.ForeignKey(TicketType, on_delete=models.CASCADE)
    attendee = models.ForeignKey(Attendee, related_name='tickets', on_delete=models.CASCADE)
    code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    payment_ref = models.CharField(max_length=100, null=True, blank=True, unique=True)
    qr_value = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.status == "paid" and not self.code:
            self.code = f"TKT-{uuid.uuid4().hex[:8].upper()}"
        if self.status == "paid" and not self.qr_value:
            self.qr_value = self.code or (self.id.hex if self.id else uuid.uuid4().hex)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.attendee.full_name}"

class CheckIn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, related_name='check_ins', on_delete=models.CASCADE)
    checked_in_by = models.CharField(max_length=255)
    checked_in_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Check-in for {self.ticket.code} at {self.checked_in_at}"
