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
  if (value.startsWith("/media/")) return value;
  return `/media/${value.replace(/^\/+/, "")}`;
}
