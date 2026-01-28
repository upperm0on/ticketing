import { useMemo, useState, useSyncExternalStore, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { eventsStore } from "../store/eventsStore.js";
import { ticketStore } from "../store/ticketStore.js";
import { formatEventDate } from "../utils/date.js";

export default function TicketSuccess() {
  const { ticketId } = useParams();
  const [copied, setCopied] = useState(false);
  const ticket = useSyncExternalStore(ticketStore.subscribe, () =>
    ticketStore.getState().tickets.find((item) => item.id === ticketId)
  );
  const eventsState = useSyncExternalStore(eventsStore.subscribe, () => eventsStore.getState());

  const event = useMemo(() => {
    if (!ticket) return null;
    return eventsState.events.find((item) => item.id === ticket.event) || null;
  }, [eventsState.events, ticket]);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  const handleCopy = async () => {
    if (!ticket?.code) return;
    try {
      await navigator.clipboard.writeText(ticket.code);
      setCopied(true);
    } catch (error) {
      setCopied(false);
    }
  };

  if (!ticket) {
    return (
      <section className="page">
        <header className="page-header">
          <h2>Ticket Not Found</h2>
          <p>We couldn't find the ticket in your current session.</p>
        </header>
        <Link className="event-button is-outline" to="/">
          Back to Events
        </Link>
      </section>
    );
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2>🎉 Ticket Confirmed!</h2>
        <p>Your registration is complete. Show the QR code at the venue for verification.</p>
      </header>

      <div className="checkout-grid">
        <section className="checkout-card">
          <h3>Event Summary</h3>
          <p className="event-meta"><strong>{event?.title || "Event"}</strong></p>
          <p className="event-meta">{formatEventDate(event?.dateTime)}</p>
          <p className="event-meta">{event?.venue}</p>
        </section>

        <section className="checkout-card">
          <h3>Attendee Summary</h3>
          <p className="event-meta">Name: {ticket.attendee.full_name}</p>
          <p className="event-meta">Age: {ticket.attendee.age}</p>
          <p className="event-meta">Phone: {ticket.attendee.phone}</p>
          {ticket.attendee.picture && (
            <div className="image-preview" style={{ marginTop: '12px' }}>
              <img src={ticket.attendee.picture} alt="Attendee" style={{ maxWidth: '150px', borderRadius: '4px' }} />
            </div>
          )}
        </section>

        <section className="checkout-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Entry QR Code</h3>
          <div className="qr-container" style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <QRCodeCanvas value={ticket.qr_value} size={200} level="H" includeMargin={true} />
          </div>
          <p className="event-meta" style={{ marginTop: '16px' }}><strong>Code: {ticket.code}</strong></p>
          <button className="event-button is-full" type="button" onClick={handleCopy} style={{ marginTop: '12px' }}>
            {copied ? "Code Copied" : "Copy Ticket Code"}
          </button>
        </section>
      </div>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link className="event-button is-outline" to="/">
          Return Home
        </Link>
      </div>
    </section>
  );
}
