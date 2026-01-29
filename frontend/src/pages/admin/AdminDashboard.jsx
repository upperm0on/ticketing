import { useSyncExternalStore, useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, QrCode, Plus } from "lucide-react";
import { logoutAdmin } from "../../store/adminStore.js";
import { eventsStore, setEvents } from "../../store/eventsStore.js";
import { fetchEvents, fetchAllTickets } from "../../services/api.js";
import { formatEventDate } from "../../utils/date.js";

export default function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const { events, ticketTypesByEventId } = useSyncExternalStore(
    eventsStore.subscribe,
    () => eventsStore.getState()
  );

  useEffect(() => {
    Promise.all([
      fetchEvents().then(setEvents),
      fetchAllTickets().then(setTickets)
    ])
      .catch((err) => {
        console.error(err);
        setError(err?.message || "Failed to load metrics.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalSold = tickets.length;
    let totalRevenue = 0;
    let totalCheckedIn = 0;

    tickets.forEach(t => {
      // Find ticket type to get price
      const eventTTs = ticketTypesByEventId[t.event] || [];
      const tt = eventTTs.find(type => type.id === t.ticket_type);
      if (tt) {
        totalRevenue += Number(tt.price);
      }
      if (t.status === 'checked_in') {
        totalCheckedIn++;
      }
    });

    const checkInRate = totalSold > 0 ? (totalCheckedIn / totalSold) * 100 : 0;

    return {
      totalSold,
      totalRevenue,
      totalCheckedIn,
      checkInRate: checkInRate.toFixed(1),
      totalEvents: events.length
    };
  }, [tickets, events, ticketTypesByEventId]);

  const handleLogout = () => {
    const confirmed = window.confirm("Log out of this account?");
    if (!confirmed) return;
    logoutAdmin();
    navigate("/admin/login");
  };

  if (isLoading) {
    return <section className="page"><p>Loading metrics...</p></section>;
  }

  return (
    <section className="page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-reveal>
        <div>
          <h2>Organizer Overview</h2>
          <p>Real-time analytics across all your events.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="event-button is-outline" type="button" onClick={handleLogout} style={{ marginTop: 0 }}>
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="form-error-banner" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }} data-stagger>
        <div className="checkout-card" style={{ textAlign: 'center' }} data-stagger-item>
          <h4 style={{ margin: '0 0 8px', color: '#666' }}>Tickets Sold</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalSold}</div>
        </div>
        <div className="checkout-card" style={{ textAlign: 'center' }} data-stagger-item>
          <h4 style={{ margin: '0 0 8px', color: '#666' }}>Gross Revenue</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>${stats.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="checkout-card" style={{ textAlign: 'center' }} data-stagger-item>
          <h4 style={{ margin: '0 0 8px', color: '#666' }}>Checked In</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalCheckedIn}</div>
          <div style={{ fontSize: '14px', color: '#2a6f2a' }}>{stats.checkInRate}% Arrival Rate</div>
        </div>
        <div className="checkout-card" style={{ textAlign: 'center' }} data-stagger-item>
          <h4 style={{ margin: '0 0 8px', color: '#666' }}>Active Events</h4>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.totalEvents}</div>
        </div>
      </div>

      <div className="checkout-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <section className="checkout-card">
          <h3>Quick Links</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <Link className="event-button is-ghost" to="/admin/events" style={{ marginTop: 0, textAlign: 'center' }}>
              <CalendarDays size={16} />
              Manage All Events
            </Link>
            <Link className="event-button is-ghost" to="/admin/verify" style={{ marginTop: 0, textAlign: 'center' }}>
              <QrCode size={16} />
              Launch Ticket Scanner
            </Link>
            <Link className="event-button" to="/admin/events/new" style={{ marginTop: 0, textAlign: 'center' }}>
              <Plus size={16} />
              Create New Event
            </Link>
          </div>
        </section>

        <section className="checkout-card">
          <h3>Top Events by Sales</h3>
          <div style={{ marginTop: '16px' }}>
            {events.slice(0, 5).map(event => {
              const eventTickets = tickets.filter(t => t.event === event.id);
              const pct = eventTickets.length > 0 ? (eventTickets.filter(t => t.status === 'checked_in').length / eventTickets.length * 100).toFixed(0) : 0;

              return (
                <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>{event.title}</div>
                    <div className="event-meta">{eventTickets.length} sold • {formatEventDate(event.dateTime)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600' }}>{pct}%</div>
                    <div className="event-meta" style={{ fontSize: '12px' }}>Check-in</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Link className="event-link" to="/">Back to Public Storefront</Link>
      </div>
    </section>
  );
}
