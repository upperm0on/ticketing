let state = {
  events: [],
  ticketTypesByEventId: {},
};

const listeners = new Set();

export function setEvents(events) {
  const eventsList = events.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    dateTime: event.date_time,
    venue: event.venue,
    flyerPreviewUrl: event.flyer,
    status: event.status,
  }));

  const ticketTypes = {};
  events.forEach(event => {
    ticketTypes[event.id] = (event.ticket_types || []).map(tt => ({
      id: tt.id,
      name: tt.name,
      price: tt.price,
      limit: tt.limit,
      soldCount: tt.sold_count,
    }));
  });

  state = {
    events: eventsList,
    ticketTypesByEventId: ticketTypes,
  };
  notify();
}

function notify() {
  listeners.forEach((listener) => listener());
}

export const eventsStore = {
  getState() {
    return state;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function addEvent(event) {
  state.events = [...state.events, event];
  notify();
  return event;
}

export function updateEvent(eventId, updates) {
  state.events = state.events.map((event) =>
    event.id === eventId ? { ...event, ...updates } : event
  );
  notify();
  return state.events.find((event) => event.id === eventId) || null;
}

export function setTicketTypes(eventId, ticketTypes) {
  state.ticketTypesByEventId = {
    ...state.ticketTypesByEventId,
    [eventId]: ticketTypes,
  };
  notify();
}

export function togglePublish(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return null;
  const nextStatus = event.status === "published" ? "draft" : "published";
  return updateEvent(eventId, { status: nextStatus });
}
