import { useMemo, useState, useSyncExternalStore, useEffect, useRef } from "react";
import { BadgeCheck, QrCode, StopCircle, XCircle } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { eventsStore, setEvents } from "../../store/eventsStore.js";
import { adminStore } from "../../store/adminStore.js";
import { addCheckIn, ticketStore, setTickets } from "../../store/ticketStore.js";
import { verifyTicket, checkInTicket, fetchEvents } from "../../services/api.js";

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/80x80?text=Photo";

export default function AdminVerify() {
  const { events, ticketTypesByEventId } = useSyncExternalStore(
    eventsStore.subscribe,
    () => eventsStore.getState()
  );
  const { checkIns } = useSyncExternalStore(ticketStore.subscribe, () =>
    ticketStore.getState()
  );
  const { email } = useSyncExternalStore(adminStore.subscribe, () => adminStore.getState());

  const [eventId, setEventId] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState({ status: "idle", message: "", ticket: null });
  const [checkedInMessage, setCheckedInMessage] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    fetchEvents().then(setEvents);
  }, []);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      }, false);

      scanner.render((decodedText) => {
        setCode(decodedText);
        setIsScanning(false);
        scanner.clear();
        scannerRef.current = null;
        // Auto-verify after scan
        handleVerify(decodedText);
      }, (error) => {
        // console.error(error);
      });

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const ticketTypeLookup = useMemo(() => {
    const lookup = {};
    Object.values(ticketTypesByEventId).forEach((types) => {
      types.forEach((ticketType) => {
        lookup[ticketType.id] = ticketType.name;
      });
    });
    return lookup;
  }, [ticketTypesByEventId]);

  const recentCheckIns = useMemo(() => {
    const lastTen = [...checkIns].slice(-10).reverse();
    return lastTen.map((entry) => ({
      ...entry,
      attendeeName: entry.attendeeName || "Unknown",
      code: entry.code || "-",
    }));
  }, [checkIns]);

  const handleVerify = async (manualCode = null) => {
    setCheckedInMessage("");
    const verifyCode = typeof manualCode === 'string' ? manualCode : code.trim();

    if (!verifyCode || !eventId) {
      setResult({ status: "error", message: "Code and Event are required", ticket: null });
      return;
    }

    try {
      const ticket = await verifyTicket(verifyCode, eventId);
      if (ticket.status === "checked_in") {
        setResult({ status: "error", message: "Already used", ticket });
      } else {
        setResult({ status: "valid", message: "Ticket valid", ticket });
      }
    } catch (err) {
      setResult({ status: "error", message: "Invalid code or event", ticket: null });
    }
  };

  const handleCheckIn = async () => {
    if (!result.ticket) return;
    try {
      const checkIn = await checkInTicket(result.ticket.id, email || "admin");
      addCheckIn({
        id: checkIn.id,
        ticketId: result.ticket.id,
        attendeeName: checkIn.attendee_name,
        code: checkIn.ticket_code,
        checkedInAt: checkIn.checked_in_at,
      });
      setCheckedInMessage("Checked in successfully!");
      setResult({ status: "idle", message: "", ticket: null });
      setCode("");
    } catch (err) {
      alert("Check-in failed");
    }
  };

  const selectedEvent = events.find((item) => item.id === eventId);
  const ticketTypeLabel = result.ticket
    ? ticketTypeLookup[result.ticket.ticket_type] || "-"
    : "-";

  return (
    <section className="page">
      <header className="page-header">
        <h2>Ticket Verification</h2>
        <p>Confirm attendance and verify identities.</p>
      </header>

      <div className="checkout-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '24px' }}>
        <div className="verify-controls-section">
          <div className="checkout-card">
            <h3>Verification Mode</h3>
            <label className="form-field">
              Target Event
              <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">Select an event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </label>

            <div style={{ marginTop: '16px' }}>
              {!isScanning ? (
                <button
                  className="event-button is-full"
                  style={{ marginBottom: '12px' }}
                  onClick={() => setIsScanning(true)}
                  disabled={!eventId}
                >
                  <QrCode size={16} />
                  Launch QR Scanner
                </button>
              ) : (
                <button
                  className="event-button is-danger is-full"
                  style={{ marginBottom: '12px' }}
                  onClick={() => setIsScanning(false)}
                >
                  <StopCircle size={16} />
                  Stop Scanning
                </button>
              )}
            </div>

            {isScanning && <div id="reader" style={{ width: '100%' }}></div>}

            <div className="manual-verify" style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
              <label className="form-field">
                Manual Code Entry
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="E.g. TKT-X1Y2Z3"
                    style={{ flex: 1 }}
                  />
                  <button className="event-button is-compact" style={{ marginTop: 0 }} onClick={() => handleVerify()}>
                    Verify
                  </button>
                </div>
              </label>
            </div>
          </div>

          <div className="checkout-card" style={{ marginTop: '20px' }}>
            <h3>Recent Activity</h3>
            {recentCheckIns.length === 0 && <p className="event-meta">No check-ins logged yet.</p>}
            <div className="checkin-log" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {recentCheckIns.map((entry) => (
                <div key={entry.id} className="recent-checkin" style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: '600' }}>{entry.attendeeName}</div>
                  <div className="event-meta">{entry.code} • {new Date(entry.checkedInAt).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="verify-results-section">
          {result.status === "idle" && !checkedInMessage && (
            <div className="checkout-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', borderStyle: 'dashed' }}>
              <p className="event-meta">Scan a QR code or enter a ticket ID to begin verification.</p>
            </div>
          )}

          {checkedInMessage && (
            <div className="verify-message verify-success" style={{ marginBottom: '20px', background: '#e7f5e7', border: '2px solid #2a6f2a' }}>
              <BadgeCheck size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
              {checkedInMessage}
            </div>
          )}

          {result.status === "error" && (
            <div className="verify-message verify-error" style={{ marginBottom: '20px' }}>
              <XCircle size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
              {result.message}
            </div>
          )}

          {result.status === "valid" && result.ticket && (
            <div className="checkout-card" style={{ border: '2px solid #2a6f2a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3>Ticket Verified</h3>
                <span className="event-status available">VALID</span>
              </div>

              <div className="verify-attendee" style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
                <img
                  className="admin-photo"
                  src={result.ticket.attendee.picture || PLACEHOLDER_IMAGE}
                  alt={result.ticket.attendee.full_name}
                  style={{ width: '120px', height: '120px', borderRadius: '8px' }}
                />
                <div style={{ flex: 1 }}>
                  <p className="event-meta"><strong>Name:</strong> {result.ticket.attendee.full_name}</p>
                  <p className="event-meta"><strong>Age:</strong> {result.ticket.attendee.age}</p>
                  <p className="event-meta"><strong>Phone:</strong> {result.ticket.attendee.phone}</p>
                  <p className="event-meta"><strong>Ticket Tier:</strong> {ticketTypeLabel}</p>
                  <p className="event-meta"><strong>Reference:</strong> {result.ticket.code}</p>
                </div>
              </div>

              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <button className="event-button is-full" onClick={handleCheckIn}>
                  Confirm Check-In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
