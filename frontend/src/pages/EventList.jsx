import { useSyncExternalStore, useEffect } from "react";
import EventCard from "../components/EventCard.jsx";
import { eventsStore, setEvents } from "../store/eventsStore.js";
import { fetchEvents } from "../services/api.js";

export default function EventList() {
  const { events, ticketTypesByEventId } = useSyncExternalStore(
    eventsStore.subscribe,
    () => eventsStore.getState()
  );

  useEffect(() => {
    fetchEvents().then(data => {
      setEvents(data);
    }).catch(err => {
      console.error("Failed to load events", err);
    });
  }, []);

  const publishedEvents = events.filter((event) => event.status === "published");

  return (
    <section className="page">
      <header className="page-header">
        <p>Volume 01 / Issue 02 — FEB 2026</p>
        <h2>The Nightlife Anthology</h2>
      </header>
      <div className="event-grid">
        {publishedEvents.map((event) => {
          const ticketTypes = ticketTypesByEventId[event.id] || [];
          const availableCount = ticketTypes.reduce((count, ticket) => {
            const remaining = Math.max(ticket.limit - ticket.soldCount, 0);
            return count + (remaining > 0 ? 1 : 0);
          }, 0);
          const availabilityLabel = availableCount > 0 ? "Available" : "Sold Out";
          const prices = ticketTypes.map((ticket) => ticket.price);
          const minPrice = prices.length ? Math.min(...prices) : 0;
          const priceLabel = minPrice === 0 ? "Free" : `From $${minPrice}`;

          return (
            <EventCard
              key={event.id}
              event={event}
              priceLabel={priceLabel}
              availabilityLabel={availabilityLabel}
            />
          );
        })}
      </div>
    </section>
  );
}
