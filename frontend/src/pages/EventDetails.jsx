import { useParams, Link } from "react-router-dom";
import { useSyncExternalStore, useEffect } from "react";
import { eventsStore, setEvents } from "../store/eventsStore.js";
import { fetchEvents } from "../services/api.js";
import { formatEventDate, normalizeFlyerUrl } from "../utils/date.js";

export default function EventDetails() {
  const { eventId } = useParams();
  const { events, ticketTypesByEventId } = useSyncExternalStore(
    eventsStore.subscribe,
    () => eventsStore.getState()
  );

  useEffect(() => {
    if (events.length === 0) {
      fetchEvents().then(setEvents);
    }
  }, [events]);

  const event = events.find((item) => item.id === eventId);
  const ticketTypes = event ? ticketTypesByEventId[event.id] || [] : [];
  const prices = ticketTypes.map((ticket) => ticket.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const priceLabel = minPrice === 0 ? "Free" : `From $${minPrice}`;

  // Django media URLs will be proxied by Vite
  const flyerSrc = normalizeFlyerUrl(event?.flyerPreviewUrl)
    || "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=1200";

  if (!event) {
    return (
      <section className="page" style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2 className="serif">MISSING ISSUE</h2>
        <p>The event you are looking for has not been published.</p>
        <Link className="event-button is-outline" to="/" style={{ marginTop: '20px' }}>
          Back to Archive
        </Link>
      </section>
    );
  }

  return (
    <section className="page">
      <header className="page-header" style={{ marginBottom: '40px' }}>
        <p>Featured Story // No. {event.id.slice(-3)}</p>
        <h2>{event.title}</h2>
      </header>

      <div className="event-details">
        <div className="event-flyer-hero">
          <img src={flyerSrc} alt={event.title} style={{ width: '100%', display: 'block' }} />
        </div>

        <div className="event-info-sidebar">
          <div className="event-meta" style={{ marginBottom: '32px', borderTop: '4px solid #000', paddingTop: '16px' }}>
            <span className="serif" style={{ fontSize: '24px' }}>{formatEventDate(event.dateTime)}</span>
            <span className="text-gold" style={{ letterSpacing: '0.1em', fontWeight: 'bold' }}>{event.venue}</span>
            <span className="serif" style={{ fontSize: '32px', marginTop: '16px' }}>{priceLabel}</span>
          </div>

          <div className="event-description">
            {event.description}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link className="event-button" to={`/checkout/${event.id}`}>
              Reserve Entry
            </Link>
            <Link className="event-link" to="/">
              ← Return to Collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
