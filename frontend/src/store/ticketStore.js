let state = {
  tickets: [],
  smsOutbox: [],
  checkIns: [],
};

const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export const ticketStore = {
  getState() {
    return state;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function addTicket(ticket) {
  state = {
    ...state,
    tickets: [...state.tickets, ticket],
  };
  notify();
  return ticket;
}
export function addTickets(newTickets) {
  state = {
    ...state,
    tickets: [...state.tickets, ...newTickets],
  };
  notify();
  return newTickets;
}

export function setTickets(tickets) {
  state = {
    ...state,
    tickets: tickets,
  };
  notify();
}

export function updateTicket(ticketId, updates) {
  state = {
    ...state,
    tickets: state.tickets.map((ticket) =>
      ticket.id === ticketId ? { ...ticket, ...updates } : ticket
    ),
  };
  notify();
  return state.tickets.find((ticket) => ticket.id === ticketId) || null;
}

export function addSms(message) {
  state = {
    ...state,
    smsOutbox: [...state.smsOutbox, message],
  };
  notify();
  return message;
}

export function addCheckIn(checkIn) {
  state = {
    ...state,
    checkIns: [...state.checkIns, checkIn],
  };
  notify();
  return checkIn;
}
