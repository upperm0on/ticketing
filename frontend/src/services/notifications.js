import { addSms } from "../store/ticketStore.js";

export function sendSms({ to, message, ticketId }) {
  const entry = {
    to,
    message,
    ticketId,
    createdAt: new Date().toISOString(),
  };
  addSms(entry);
  console.log("[SMS OUTBOX]", entry);
  return entry;
}
