import { useMemo, useState, useSyncExternalStore, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { eventsStore } from "../../store/eventsStore.js";
import { ticketStore, setTickets } from "../../store/ticketStore.js";
import { fetchTicketsByEvent } from "../../services/api.js";

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/80x80?text=Photo";

export default function AdminAttendees() {
  const { id } = useParams();
  const [query, setQuery] = useState("");
  const { events, ticketTypesByEventId } = useSyncExternalStore(
    eventsStore.subscribe,
    () => eventsStore.getState()
  );
  const { tickets } = useSyncExternalStore(ticketStore.subscribe, () => ticketStore.getState());

  useEffect(() => {
    fetchTicketsByEvent(id).then(setTickets).catch(console.error);
  }, [id]);

  const event = events.find((item) => item.id === id);
  const ticketTypes = ticketTypesByEventId[id] || [];
  const ticketTypeLookup = useMemo(() => {
    return ticketTypes.reduce((acc, ticket) => {
      acc[ticket.id] = ticket.name;
      return acc;
    }, {});
  }, [ticketTypes]);

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (ticket.event !== id || ticket.status === "cancelled") return false;
      if (!normalizedQuery) return true;
      const nameMatch = ticket.attendee.full_name.toLowerCase().includes(normalizedQuery);
      const phoneMatch = ticket.attendee.phone.toLowerCase().includes(normalizedQuery);
      return nameMatch || phoneMatch;
    });
  }, [tickets, id, query]);

  if (!event) {
    return (
      <section className="page">
        <header className="page-header">
          <h2>Event Not Found</h2>
          <p>The event you are looking for does not exist.</p>
        </header>
        <Link className="event-button" to="/admin/events">
          Back to Events
        </Link>
      </section>
    );
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>Attendees</h2>
        <p>{event.title}</p>
      </header>

      <div className="admin-actions">
        <input
          className="admin-search"
          type="text"
          placeholder="Search by name or phone"
          value={query}
          onChange={(eventTarget) => setQuery(eventTarget.target.value)}
        />
        <Link className="event-link" to="/admin/events">
          Back to Events
        </Link>
      </div>

      <div className="admin-table admin-attendees-table">
        <div className="admin-row admin-header-row admin-attendee-row">
          <span>Photo</span>
          <span>Name</span>
          <span>Age</span>
          <span>Phone</span>
          <span>Ticket Type</span>
          <span>Code</span>
          <span>Status</span>
        </div>
        {filteredTickets.map((ticket) => (
          <div key={ticket.id} className="admin-row admin-attendee-row">
            <div className="admin-cell" data-label="Photo">
              <img
                className="admin-photo"
                src={ticket.attendee.picture || PLACEHOLDER_IMAGE}
                alt={ticket.attendee.full_name}
              />
            </div>
            <div className="admin-cell" data-label="Name">{ticket.attendee.full_name}</div>
            <div className="admin-cell" data-label="Age">{ticket.attendee.age}</div>
            <div className="admin-cell" data-label="Phone">{ticket.attendee.phone}</div>
            <div className="admin-cell" data-label="Ticket Type">{ticket.ticket_type_name || "-"}</div>
            <div className="admin-cell" data-label="Code">{ticket.code || "-"}</div>
            <div className="admin-cell" data-label="Status">{ticket.status}</div>
          </div>
        ))}
        {filteredTickets.length === 0 && (
          <div className="admin-row">
            <span>No paid attendees found.</span>
          </div>
        )}
      </div>
    </section>
  );
}
