import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from events.models import Event, TicketType

seed_events = [
    {
        "id": "evt-milan-01",
        "title": "Milan Skybar: Golden Hour",
        "date_time": "Sat, Feb 14, 2026 · 5:30 PM",
        "venue": "Milan Skybar, Asokwa",
        "description": "Experience the legendary Kumasi sunset from the city's premier rooftop. An evening of sophisticated afro-fusion rhythms, artisanal cocktails, and unmatched skyline views. Dress code: Sunset Elegance.",
        "flyer": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=1200",
        "ticketTypes": [
            {"id": "tt-m-1", "name": "Sunset Terrace", "price": 200, "limit": 80, "soldCount": 45},
            {"id": "tt-m-2", "name": "Owner's Box VIP", "price": 2500, "limit": 5, "soldCount": 1},
        ],
    },
    {
        "id": "evt-luxe-02",
        "title": "The Afro-Luxe Gala",
        "date_time": "Fri, Feb 20, 2026 · 9:00 PM",
        "venue": "The Grand Ballroom, Kumasi",
        "description": "Celebrating the pinnacle of African fashion and music. A high-energy night with curated lighting, cinematic vibes, and the continent's finest DJs. Motion, rhythm, and pure sophistication.",
        "flyer": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1200",
        "ticketTypes": [
            {"id": "tt-l-1", "name": "General Admission", "price": 100, "limit": 300, "soldCount": 120},
            {"id": "tt-l-2", "name": "Backstage Table", "price": 4000, "limit": 8, "soldCount": 3},
        ],
    },
    {
        "id": "evt-amber-03",
        "title": "Amber Lounge Sessions",
        "date_time": "Sun, Feb 22, 2026 · 7:00 PM",
        "venue": "Amber Lounge, Asokwa",
        "description": "Intimate, warm, and exclusively black-tie. Join us for a curated live session featuring neo-soul and highlife in a setting of deep ambers and rich velvet. No neon, just soul.",
        "flyer": "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=1200",
        "ticketTypes": [
            {"id": "tt-a-1", "name": "Lounge Entry", "price": 150, "limit": 50, "soldCount": 12},
        ],
    },
]

def seed():
    for event_data in seed_events:
        # We'll generate new UUIDs if we don't want to use the string IDs from frontend
        # but for compatibility during transition, we could use them if they are valid UUIDs.
        # They aren't (e.g. 'evt-101'). So we'll just create them.
        event = Event.objects.create(
            title=event_data['title'],
            date_time=event_data['date_time'],
            venue=event_data['venue'],
            description=event_data['description'],
            flyer=event_data.get('flyer'),
            status='published'
        )
        for tt_data in event_data['ticketTypes']:
            TicketType.objects.create(
                event=event,
                name=tt_data['name'],
                price=tt_data['price'],
                limit=tt_data['limit'],
                sold_count=tt_data['soldCount']
            )
    print("Seed complete.")

if __name__ == '__main__':
    seed()
