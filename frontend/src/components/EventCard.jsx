import { Link } from "react-router-dom";
import { formatEventDate, normalizeFlyerUrl } from "../utils/date.js";

export default function EventCard({ event, priceLabel, availabilityLabel }) {
  const flyerSrc = normalizeFlyerUrl(event.flyerPreviewUrl)
    || "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=800";

  return (
    <article className="event-card" onClick={() => window.location.href = `/events/${event.id}`}>
      <div className="event-flyer">
        <img src={flyerSrc} alt={event.title} />
      </div>
      <div className="event-card-body">
        <span className="event-category">No. {event.id.slice(-3)} // Nightlife</span>
        <h3>{event.title}</h3>
        <div className="event-meta">
          <span>{event.venue}</span>
          <span>{formatEventDate(event.dateTime)}</span>
        </div>
        <div className="event-price serif">
          {priceLabel}
        </div>

      </div>
    </article>
  );
}
