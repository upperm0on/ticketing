from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests


@api_view(["POST"])
@permission_classes([AllowAny])
def google_login(request):
    credential = request.data.get("credential")
    if not credential:
        return Response({"error": "Missing credential"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID or None,
        )
    except Exception:
        return Response({"error": "Invalid Google token"}, status=status.HTTP_400_BAD_REQUEST)

    email = payload.get("email")
    if not email:
        return Response({"error": "Email not available"}, status=status.HTTP_400_BAD_REQUEST)

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email,
            "first_name": payload.get("given_name", ""),
            "last_name": payload.get("family_name", ""),
        },
    )
    if created:
        user.set_unusable_password()
        user.save(update_fields=["password"])

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "email": user.email,
        },
        status=status.HTTP_200_OK,
    )
