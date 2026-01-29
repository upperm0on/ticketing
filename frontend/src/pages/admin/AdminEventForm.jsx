import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { eventsStore, setEvents } from "../../store/eventsStore.js";
import { saveEvent, fetchEvents } from "../../services/api.js";

const EMPTY_EVENT = {
  title: "",
  description: "",
  dateTime: "",
  venue: "",
  flyerPreviewUrl: "",
  status: "draft",
};

function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createTicketType() {
  return {
    id: generateId("tt"),
    name: "",
    price: "",
    limit: "",
    soldCount: 0,
  };
}

export default function AdminEventForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { events, ticketTypesByEventId } = useSyncExternalStore(
    eventsStore.subscribe,
    () => eventsStore.getState()
  );

  const existingEvent = useMemo(() => events.find((event) => event.id === id), [events, id]);
  const [eventData, setEventData] = useState(EMPTY_EVENT);
  const [ticketTypes, setLocalTicketTypes] = useState([createTicketType()]);
  const [flyerFile, setFlyerFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (events.length === 0) {
      fetchEvents().then(setEvents);
    }
  }, [events]);

  useEffect(() => {
    if (mode === "edit" && existingEvent) {
      setEventData({
        title: existingEvent.title,
        description: existingEvent.description || "",
        dateTime: existingEvent.dateTime,
        venue: existingEvent.venue,
        flyerPreviewUrl: existingEvent.flyerPreviewUrl,
        status: existingEvent.status,
      });
      const existingTickets = ticketTypesByEventId[existingEvent.id] || [];
      setLocalTicketTypes(
        existingTickets.map((ticket) => ({
          id: ticket.id,
          name: ticket.name,
          price: String(ticket.price),
          limit: String(ticket.limit),
          soldCount: ticket.soldCount ?? 0,
        }))
      );
    }

    if (mode === "new") {
      setEventData(EMPTY_EVENT);
      setLocalTicketTypes([createTicketType()]);
      setFlyerFile(null);
    }
  }, [mode, existingEvent, ticketTypesByEventId]);

  if (mode === "edit" && !existingEvent && events.length > 0) {
    return (
      <section className="page">
        <header className="page-header">
          <h2>Event Not Found</h2>
          <p>The event you are trying to edit does not exist.</p>
        </header>
        <Link className="event-button" to="/admin/events">
          Back to Events
        </Link>
      </section>
    );
  }

  const requiredValid =
    eventData.title.trim() && eventData.dateTime.trim() && eventData.venue.trim();
  const ticketTypeValid = ticketTypes.length > 0 &&
    ticketTypes.every((ticket) => {
      const price = Number(ticket.price);
      const limit = Number(ticket.limit);
      return (
        ticket.name.trim() &&
        Number.isFinite(price) &&
        price >= 0 &&
        Number.isFinite(limit) &&
        limit >= 1
      );
    });

  const canSave = Boolean(requiredValid && ticketTypeValid && !isSaving);
  const validationHints = [];
  if (!eventData.title.trim()) validationHints.push("Title is required");
  if (!eventData.dateTime.trim()) validationHints.push("Date & time is required");
  if (!eventData.venue.trim()) validationHints.push("Venue is required");
  if (!ticketTypeValid) validationHints.push("Complete all ticket tiers");

  const handleChange = (field) => (eventTarget) => {
    setEventData((prev) => ({ ...prev, [field]: eventTarget.target.value }));
  };

  const handleFlyerChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFlyerFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setEventData((prev) => ({ ...prev, flyerPreviewUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const updateTicketType = (ticketId, field, value) => {
    setLocalTicketTypes((prev) =>
      prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, [field]: value } : ticket))
    );
  };

  const handleAddTicketType = () => {
    setLocalTicketTypes((prev) => [...prev, createTicketType()]);
  };

  const handleRemoveTicketType = (ticketId) => {
    setLocalTicketTypes((prev) => prev.filter((ticket) => ticket.id !== ticketId));
  };

  const handleSave = async (eventTarget) => {
    eventTarget.preventDefault();
    if (!canSave) return;
    setIsSaving(true);
    setSaveError("");

    try {
      await saveEvent({
        ...eventData,
        id: mode === 'edit' ? id : undefined,
        ticket_types: ticketTypes,
        flyerFile: flyerFile
      }, mode);

      const freshEvents = await fetchEvents();
      setEvents(freshEvents);
      navigate("/admin/events");
    } catch (err) {
      console.error("Failed to save event", err);
      setSaveError(err?.message || "Error saving event. Check console.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="page">
      <header className="page-header" data-reveal>
        <h2>{mode === "new" ? "Create Event" : "Edit Event"}</h2>
        <p>Define event details and ticket types.</p>
      </header>

      <form className="admin-form" onSubmit={handleSave} data-reveal data-reveal-distance="28">
        <div className="form-grid">
          <label className="form-field is-full">
            Title
            <input type="text" value={eventData.title} onChange={handleChange("title")} required />
          </label>

          <label className="form-field is-full">
            Description
            <textarea
              rows="4"
              value={eventData.description}
              onChange={handleChange("description")}
            />
          </label>

          <label className="form-field">
            Date & Time
            <input
              type="date"
              value={eventData.dateTime}
              onChange={handleChange("dateTime")}
              required
            />
          </label>

          <label className="form-field">
            Venue
            <input type="text" value={eventData.venue} onChange={handleChange("venue")} required />
          </label>

          <label className="form-field is-full">
            Flyer Upload
            <input type="file" accept="image/*" onChange={handleFlyerChange} />
            {eventData.flyerPreviewUrl && (
              <div className="image-preview" style={{ marginTop: '10px' }}>
                <img src={eventData.flyerPreviewUrl} alt="Event flyer preview" style={{ maxWidth: '300px' }} />
              </div>
            )}
          </label>

          <label className="form-field">
            Status
            <select value={eventData.status} onChange={handleChange("status")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <h3>Ticket Tiers</h3>
            <p className="form-section-kicker">Pricing and limits per tier.</p>
          </div>
          {ticketTypes.map((ticket) => (
            <div key={ticket.id} className="ticket-type-row">
              <div className="ticket-type-grid">
                <label className="form-field">
                  Name
                  <input
                    type="text"
                    value={ticket.name}
                    onChange={(e) => updateTicketType(ticket.id, "name", e.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  Price ($)
                  <input
                    type="number"
                    min="0"
                    value={ticket.price}
                    onChange={(e) => updateTicketType(ticket.id, "price", e.target.value)}
                    required
                  />
                </label>
                <label className="form-field">
                  Limit
                  <input
                    type="number"
                    min="1"
                    value={ticket.limit}
                    onChange={(e) => updateTicketType(ticket.id, "limit", e.target.value)}
                    required
                  />
                </label>
                <button
                  className="event-button is-danger is-compact"
                  type="button"
                  onClick={() => handleRemoveTicketType(ticket.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button className="event-button is-dashed is-full" type="button" onClick={handleAddTicketType}>
            + Add Another Ticket Tier
          </button>
        </div>

        <div className="form-actions">
          <button className="event-button is-full" type="submit" disabled={!canSave}>
            {isSaving ? "Saving..." : (mode === "new" ? "Create Event" : "Update Event")}
          </button>
          {!canSave && validationHints.length > 0 && (
            <p className="form-helper">{validationHints.join(" · ")}</p>
          )}
          {saveError && (
            <p className="form-error-banner">{saveError}</p>
          )}
          <Link className="event-link" to="/admin/events">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
