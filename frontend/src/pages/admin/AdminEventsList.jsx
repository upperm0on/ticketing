import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { eventsStore, setEvents } from "../../store/eventsStore.js";
import { fetchEvents, deleteEvent, updateEventStatus } from "../../services/api.js";
import { formatEventDate } from "../../utils/date.js";
import { FileEdit, Users, Trash2, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";

export default function AdminEventsList() {
  const { events } = useSyncExternalStore(eventsStore.subscribe, () => eventsStore.getState());
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const refreshEvents = () => {
    fetchEvents().then(setEvents).catch((err) => {
      console.error(err);
      setActionError(err?.message || "Failed to refresh events.");
    });
  };

  useEffect(() => {
    refreshEvents();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event? This will remove all associated ticket types.")) return;
    try {
      setActionError("");
      setActionMessage("");
      await deleteEvent(id);
      refreshEvents();
      setActionMessage("Event deleted.");
    } catch (err) {
      setActionError(err?.message || "Delete failed");
    }
  };

  const handleTogglePublish = async (event) => {
    const nextStatus = event.status === 'published' ? 'draft' : 'published';
    try {
      setActionError("");
      setActionMessage("");
      await updateEventStatus(event.id, nextStatus);
      refreshEvents();
      setActionMessage(`Event ${nextStatus}.`);
    } catch (err) {
      setActionError(err?.message || "Toggle status failed");
    }
  };

  return (
    <section className="page">
      <header className="page-header" data-reveal>
        <h2>Event Management</h2>
        <p>Maintain your event listings and monitor registrations.</p>
      </header>

      <div className="admin-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-reveal>
        <Link className="event-button" to="/admin/events/new">
          Create New Event
        </Link>
        <Link className="event-link" to="/admin/dashboard">
          Back to Dashboard
        </Link>
      </div>
      {(actionMessage || actionError) && (
        <div className={`form-error-banner ${actionMessage ? "is-success" : ""}`} style={{ marginTop: '16px' }}>
          {actionMessage || actionError}
        </div>
      )}

      <div className="admin-table admin-events-table" style={{ marginTop: '24px' }} data-reveal>
        <div className="admin-row admin-header-row admin-events-row">
          <span>Event Title</span>
          <span>Venue</span>
          <span>Date/Time</span>
          <span>Status</span>
          <span>Operations</span>
        </div>
        {events.length === 0 && (
          <div className="admin-row admin-events-row admin-empty-row">
            <p>No events found. Start by creating one!</p>
          </div>
        )}
        {events.map((ev) => (
          <div key={ev.id} className="admin-row admin-events-row">
            <div className="admin-cell admin-event-title" data-label="Event">
              {ev.title}
            </div>
            <div className="admin-cell" data-label="Venue">
              {ev.venue}
            </div>
            <div className="admin-cell event-meta" data-label="Date & Time">
              {formatEventDate(ev.dateTime)}
            </div>
            <div className="admin-cell" data-label="Status">
              <span className={`status-pill ${ev.status === "published" ? "is-live" : "is-draft"}`}>
                {ev.status}
              </span>
            </div>
            <div className="admin-cell admin-actions-cell" data-label="Operations">
              <Link className="event-button is-compact" to={`/admin/events/${ev.id}/edit`}>
                <FileEdit size={16} />
              </Link>
              <Link className="event-button is-compact" to={`/admin/events/${ev.id}/attendees`}>
                <Users size={16} />
              </Link>
              <button
                className="event-button is-compact is-outline"
                type="button"
                onClick={() => handleTogglePublish(ev)}
              >
                {ev.status === "published" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
              </button>
              <button
                className="event-button is-compact is-danger"
                type="button"
                onClick={() => handleDelete(ev.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
