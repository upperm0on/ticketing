from django.conf import settings
from rest_framework import serializers
from .models import Event, TicketType, Attendee, Ticket, CheckIn

class TicketTypeSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    class Meta:
        model = TicketType
        fields = ['id', 'name', 'price', 'limit', 'sold_count']

class EventSerializer(serializers.ModelSerializer):
    ticket_types = TicketTypeSerializer(many=True, required=False)

    class Meta:
        model = Event
        fields = ['id', 'title', 'date_time', 'venue', 'description', 'flyer', 'status', 'ticket_types']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        flyer = data.get('flyer')
        if flyer:
            request = self.context.get('request')
            if flyer.startswith('http://') or flyer.startswith('https://'):
                return data
            if flyer.startswith('/'):
                data['flyer'] = request.build_absolute_uri(flyer) if request else flyer
                return data
            media_path = f"{settings.MEDIA_URL}{flyer.lstrip('/')}"
            data['flyer'] = request.build_absolute_uri(media_path) if request else media_path
        return data

    def create(self, validated_data):
        ticket_types_data = validated_data.pop('ticket_types', [])
        event = Event.objects.create(**validated_data)
        for tt_data in ticket_types_data:
            TicketType.objects.create(event=event, **tt_data)
        return event

    def update(self, instance, validated_data):
        ticket_types_data = validated_data.pop('ticket_types', None)
        
        # Update event fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if ticket_types_data is not None:
            # Simple approach: delete existing and recreat or update by ID
            # Let's try update/create by ID if ID is present, else create.
            existing_ids = [tt.id for tt in instance.ticket_types.all()]
            new_ids = []
            
            for tt_data in ticket_types_data:
                tt_id = tt_data.get('id')
                if tt_id and tt_id in existing_ids:
                    tt_instance = TicketType.objects.get(id=tt_id)
                    for attr, value in tt_data.items():
                        setattr(tt_instance, attr, value)
                    tt_instance.save()
                    new_ids.append(tt_id)
                else:
                    new_tt = TicketType.objects.create(event=instance, **tt_data)
                    new_ids.append(new_tt.id)
            
            # Delete ticket types not in the new list
            instance.ticket_types.exclude(id__in=new_ids).delete()

        return instance

class AttendeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendee
        fields = ['id', 'full_name', 'email', 'age', 'phone', 'picture']

class TicketSerializer(serializers.ModelSerializer):
    attendee = AttendeeSerializer(read_only=True)
    ticket_type_name = serializers.CharField(source='ticket_type.name', read_only=True)
    
    # Flattened attendee fields for input
    full_name = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    age = serializers.IntegerField(write_only=True)
    phone = serializers.CharField(write_only=True)
    picture = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = Ticket
        fields = [
            'id', 'event', 'ticket_type', 'ticket_type_name', 'attendee', 
            'code', 'payment_ref', 'qr_value', 'status', 'created_at',
            'full_name', 'email', 'age', 'phone', 'picture'
        ]
        extra_kwargs = {
            'code': {'required': False},
            'qr_value': {'required': False},
        }

    def create(self, validated_data):
        full_name = validated_data.pop('full_name')
        email = validated_data.pop('email')
        age = validated_data.pop('age')
        phone = validated_data.pop('phone')
        picture = validated_data.pop('picture', None)
        
        attendee = Attendee.objects.create(
            full_name=full_name,
            email=email,
            age=age,
            phone=phone,
            picture=picture
        )
        ticket = Ticket.objects.create(attendee=attendee, **validated_data)
        return ticket


class TicketPurchaseSerializer(serializers.Serializer):
    event = serializers.UUIDField()
    ticket_type = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    age = serializers.IntegerField()
    phone = serializers.CharField()
    picture = serializers.ImageField(required=False)
    quantity = serializers.IntegerField(default=1, min_value=1, max_value=10)

class CheckInSerializer(serializers.ModelSerializer):
    attendee_name = serializers.CharField(source='ticket.attendee.full_name', read_only=True)
    ticket_code = serializers.CharField(source='ticket.code', read_only=True)

    class Meta:
        model = CheckIn
        fields = ['id', 'ticket', 'attendee_name', 'ticket_code', 'checked_in_by', 'checked_in_at']
