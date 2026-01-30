import { API_BASE_URL } from "../services/api.js";

export function formatEventDate(value) {
  if (!value) return "";
  const raw = String(value);
  const hasTime = /(\d{1,2}:\d{2})|T\d{2}:\d{2}/.test(raw);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  const options = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  if (hasTime) {
    options.hour = "numeric";
    options.minute = "2-digit";
  }
  return new Intl.DateTimeFormat("en-US", options).format(parsed);
}

export function normalizeFlyerUrl(value) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const normalized = value.startsWith("/media/")
    ? value
    : `/media/${value.replace(/^\/+/, "")}`;
  if (!API_BASE_URL) return normalized;
  return `${API_BASE_URL.replace(/\/$/, "")}${normalized}`;
}
