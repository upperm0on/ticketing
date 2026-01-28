import { useMemo, useState, useSyncExternalStore, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { eventsStore } from "../../store/eventsStore.js";
import { ticketStore, setTickets } from "../../store/ticketStore.js";
import { fetchTicketsByEvent, resendTicketCode } from "../../services/api.js";

export default function AdminTickets() {
  const { id } = useParams();
  const [queued, setQueued] = useState({});
  const { events, ticketTypesByEventId } = useSyncExternalStore(
    eventsStore.subscribe,
    () => eventsStore.getState()
  );
  const { tickets } = useSyncExternalStore(ticketStore.subscribe, () => ticketStore.getState());

  const event = events.find((item) => item.id === id);
  useEffect(() => {
    if (id) {
      fetchTicketsByEvent(id).then(setTickets).catch(console.error);
    }
  }, [id]);
  const ticketTypes = ticketTypesByEventId[id] || [];
  const ticketTypeLookup = useMemo(() => {
    return ticketTypes.reduce((acc, ticket) => {
      acc[ticket.id] = ticket.name;
      return acc;
    }, {});
  }, [ticketTypes]);

  const eventTickets = tickets.filter((ticket) => ticket.event === id);

  const handleResend = async (ticket) => {
    if (ticket.status !== "paid" || !ticket.code) return;
    try {
      await resendTicketCode(ticket.id);
      setQueued((prev) => ({ ...prev, [ticket.id]: true }));
      setTimeout(() => {
        setQueued((prev) => ({ ...prev, [ticket.id]: false }));
      }, 2000);
    } catch (error) {
      alert("Resend failed");
    }
  };

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
        <h2>Tickets</h2>
        <p>{event.title}</p>
      </header>

      <div className="admin-actions">
        <Link className="event-link" to="/admin/events">
          Back to Events
        </Link>
      </div>

      <div className="admin-table admin-tickets-table">
        <div className="admin-row admin-header-row admin-ticket-row">
          <span>Ticket ID</span>
          <span>Ticket Type</span>
          <span>Status</span>
          <span>Payment Ref</span>
          <span>Code</span>
          <span>Created</span>
          <span>Actions</span>
        </div>
        {eventTickets.map((ticket) => {
          const canResend = ticket.status === "paid" && Boolean(ticket.code);
          return (
            <div key={ticket.id} className="admin-row admin-ticket-row">
              <div className="admin-cell" data-label="Ticket ID">{ticket.id}</div>
              <div className="admin-cell" data-label="Ticket Type">{ticketTypeLookup[ticket.ticket_type] || "-"}</div>
              <div className="admin-cell" data-label="Status">{ticket.status}</div>
              <div className="admin-cell" data-label="Payment Ref">{ticket.payment_ref || "-"}</div>
              <div className="admin-cell" data-label="Code">{ticket.code || "-"}</div>
              <div className="admin-cell" data-label="Created">{ticket.created_at || "-"}</div>
              <div className="admin-cell admin-actions-cell" data-label="Actions">
                <button
                  className="event-button is-compact"
                  type="button"
                  disabled={!canResend}
                  onClick={() => handleResend(ticket)}
                >
                  Resend Code (SMS)
                </button>
                {queued[ticket.id] && <span className="admin-note">SMS queued</span>}
              </div>
            </div>
          );
        })}
        {eventTickets.length === 0 && (
          <div className="admin-row">
            <span>No tickets found for this event.</span>
          </div>
        )}
      </div>
    </section>
  );
}
