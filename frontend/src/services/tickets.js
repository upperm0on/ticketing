import { eventsStore } from "../store/eventsStore.js";
import { addTicket, ticketStore, updateTicket } from "../store/ticketStore.js";
import { sendSms } from "./notifications.js";

function randomToken(length) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

function generateTicketId() {
  return `TKT-${randomToken(6)}`;
}

function generateTicketCode() {
  return `EVT-2026-${randomToken(6)}`;
}

export function createTicket({ eventId, ticketTypeId, attendee }) {
  const ticket = {
    id: generateTicketId(),
    eventId,
    ticketTypeId,
    attendee,
    status: "pending",
    code: "",
    qrValue: "",
    paymentRef: "",
    createdAt: new Date().toISOString(),
  };
  addTicket(ticket);
  return ticket;
}

export function finalizeTicket(ticketId, paymentRef) {
  const ticket = ticketStore.getState().tickets.find((item) => item.id === ticketId);
  if (!ticket) return null;

  const code = generateTicketCode();
  const qrValue = `${ticketId}|${code}`;
  const updated = updateTicket(ticketId, {
    status: "paid",
    code,
    qrValue,
    paymentRef,
  });

  const event = eventsStore.getState().events.find((item) => item.id === ticket.eventId);
  const eventTitle = event?.title || "the event";

  sendSms({
    to: ticket.attendee.phone,
    message: `Your ticket code for ${eventTitle} is ${code}. Keep it safe.`,
    ticketId,
  });

  return updated;
}
