import { useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { eventsStore } from "../store/eventsStore.js";
import { userStore } from "../store/userStore.js";
import { addTickets } from "../store/ticketStore.js";
import { initializePayment } from "../services/api.js";
import { formatEventDate } from "../utils/date.js";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

function formatMoney(value) {
  if (value === 0) return "Free";
  return `$${value}`;
}

export default function Checkout() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { events, ticketTypesByEventId } = useSyncExternalStore(
    eventsStore.subscribe,
    () => eventsStore.getState()
  );
  const user = useSyncExternalStore(userStore.subscribe, userStore.getState);

  const event = events.find((item) => item.id === eventId);

  const ticketTypes = useMemo(() => {
    if (!event) return [];
    const list = ticketTypesByEventId[event.id] || [];
    return list.map((ticket) => ({
      ...ticket,
      remaining: Math.max(ticket.limit - ticket.soldCount, 0),
    }));
  }, [event, ticketTypesByEventId]);

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user.email || "");
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState("");
  const [pictureError, setPictureError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isPaying, setIsPaying] = useState(false);

  if (!event) {
    return (
      <section className="page">
        <header className="page-header">
          <h2>Event Not Found</h2>
          <p>The event you are looking for does not exist.</p>
        </header>
        <Link className="event-button is-outline" to="/">
          Back to Events
        </Link>
      </section>
    );
  }

  const selectedTicket = ticketTypes.find((ticket) => ticket.id === selectedTicketId);
  const nameValid = fullName.trim().length > 0;
  const ageNumber = Number(age);
  const ageValid = Number.isFinite(ageNumber) && ageNumber > 0;
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 7;
  const emailValid = email.trim().length > 3 && email.includes("@");
  const pictureValid = Boolean(pictureFile) && pictureError.length === 0;
  const quantityValid = quantity >= 1 && (selectedTicket ? quantity <= selectedTicket.remaining : true);
  const canProceed =
    Boolean(selectedTicket) && nameValid && ageValid && phoneValid && emailValid && pictureValid && quantityValid && !isPaying;

  const handlePictureChange = (eventTarget) => {
    const file = eventTarget.files?.[0];

    if (!file) {
      setPictureFile(null);
      setPicturePreview("");
      setPictureError("Picture is required.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPictureFile(null);
      setPicturePreview("");
      setPictureError("Please upload an image file.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setPictureFile(null);
      setPicturePreview("");
      setPictureError("Image must be 2MB or smaller.");
      return;
    }

    setPictureFile(file);
    setPictureError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setPicturePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleProceed = async () => {
    if (!canProceed) return;
    setIsPaying(true);
    try {
      const response = await initializePayment({
        eventUuid: event.id,
        ticketTypeUuid: selectedTicketId,
        attendee: {
          fullName: fullName.trim(),
          email: email.trim(),
          age: ageNumber,
          phone: phone.trim(),
          pictureFile: pictureFile,
        },
        quantity: quantity,
      });
      if (response.status === "paid" && response.tickets) {
        addTickets(response.tickets);
        navigate(`/ticket/success/${response.tickets[0].id}`);
        return;
      }
      if (response.authorization_url) {
        window.location.href = response.authorization_url;
        return;
      }
      throw new Error("Payment initialization failed");
    } catch (error) {
      console.error("Payment/Checkout failed", error);
      setIsPaying(false);
    }
  };

  return (
    <section className="page">
      <header className="page-header" data-reveal>
        <h2>Checkout</h2>
        <p>Confirm your event and provide attendee details.</p>
      </header>

      <div className="checkout-grid" data-stagger>
        <section className="checkout-card" data-stagger-item>
          <h3>Event Summary</h3>
          <p className="event-meta">{event.title}</p>
          <p className="event-meta">{formatEventDate(event.dateTime)}</p>
          <p className="event-meta">{event.venue}</p>
        </section>

        <section className="checkout-card" data-stagger-item>
          <h3>Ticket Type</h3>
          <div className="ticket-list">
            {ticketTypes.map((ticket) => (
              <label
                key={ticket.id}
                className={`ticket-option ${ticket.remaining === 0 ? "disabled" : ""}`}
              >
                <input
                  type="radio"
                  name="ticketType"
                  value={ticket.id}
                  checked={selectedTicketId === ticket.id}
                  onChange={() => setSelectedTicketId(ticket.id)}
                  disabled={ticket.remaining === 0}
                />
                <div>
                  <p className="ticket-title">{ticket.name}</p>
                  <p className="event-meta">Price: {formatMoney(ticket.price)}</p>
                  <p className="event-meta">
                    Remaining: {ticket.remaining} / {ticket.limit}
                  </p>
                  <p className="event-meta">
                    Status: {ticket.remaining === 0 ? "Sold Out" : "Available"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="checkout-card" data-stagger-item>
          <h3>Attendee Details</h3>
          <form className="attendee-form">
            <label className="form-field">
              Full Name
              <input
                type="text"
                value={fullName}
                onChange={(eventTarget) => setFullName(eventTarget.target.value)}
                required
              />
              {!nameValid && <span className="form-error">Full name is required.</span>}
            </label>

            <label className="form-field">
              Age
              <input
                type="number"
                value={age}
                onChange={(eventTarget) => setAge(eventTarget.target.value)}
                required
              />
              {!ageValid && <span className="form-error">Enter a valid age.</span>}
            </label>

            <label className="form-field">
              Phone Number
              <input
                type="text"
                value={phone}
                onChange={(eventTarget) => setPhone(eventTarget.target.value)}
                required
              />
              {!phoneValid && <span className="form-error">Enter a valid phone number.</span>}
            </label>

            <label className="form-field">
              Email
              <input
                type="email"
                value={email}
                onChange={(eventTarget) => setEmail(eventTarget.target.value)}
                required
              />
              {!emailValid && <span className="form-error">Enter a valid email.</span>}
            </label>

            <label className="form-field">
              Picture Upload
              <input
                type="file"
                accept="image/*"
                onChange={(eventTarget) => handlePictureChange(eventTarget.target)}
                required
              />
              {pictureError && <span className="form-error">{pictureError}</span>}
              {picturePreview && (
                <div className="image-preview">
                  <img src={picturePreview} alt="Attendee preview" />
                </div>
              )}
            </label>
          </form>
        </section>

        <section className="checkout-card" data-stagger-item>
          <h3>Order Details</h3>
          <div className="attendee-form">
            <label className="form-field">
              Quantity
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="button" className="event-button is-ghost is-square" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ textAlign: 'center', width: '60px' }}
                />
                <button type="button" className="event-button is-ghost is-square" onClick={() => setQuantity(q => Math.min(selectedTicket?.remaining || 1, q + 1))}>+</button>
              </div>
              {selectedTicket && quantity > selectedTicket.remaining && <span className="form-error">Only {selectedTicket.remaining} left.</span>}
            </label>
          </div>
          <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '12px' }}>
            <p className="event-meta">
              Ticket Price: {selectedTicket ? formatMoney(selectedTicket.price) : "-"}
            </p>
            <p className="event-meta">Quantity: {quantity}</p>
            <p className="event-meta">
              <strong>Total: {selectedTicket ? formatMoney(selectedTicket.price * quantity) : "-"}</strong>
            </p>
          </div>
        </section>

        <section className="checkout-actions" data-stagger-item>
          <button className="event-button is-full" type="button" onClick={handleProceed} disabled={!canProceed}>
            {isPaying ? "Processing..." : "Proceed to Payment"}
          </button>
          <Link className="event-link" to={`/events/${event.id}`}>
            Back to Event Details
          </Link>
        </section>
      </div>
    </section>
  );
}
