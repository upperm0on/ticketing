from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, TicketViewSet, CheckInViewSet, AttendeeViewSet, paystack_webhook

router = DefaultRouter()
router.register(r'events', EventViewSet)
router.register(r'tickets', TicketViewSet)
router.register(r'check-ins', CheckInViewSet)
router.register(r'attendees', AttendeeViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('payments/webhook/', paystack_webhook),
]
