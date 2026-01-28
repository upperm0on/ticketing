from django.contrib import admin
from .models import Event, TicketType, Attendee, Ticket, CheckIn

admin.site.register(Event)
admin.site.register(TicketType)
admin.site.register(Attendee)
admin.site.register(Ticket)
admin.site.register(CheckIn)
