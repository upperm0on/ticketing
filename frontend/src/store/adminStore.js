const storedAccess = localStorage.getItem("accessToken") || "";
const storedRefresh = localStorage.getItem("refreshToken") || "";
const storedEmail = localStorage.getItem("adminEmail") || "admin";

const state = {
  isAuthed: Boolean(storedAccess),
  email: storedEmail,
  accessToken: storedAccess,
  refreshToken: storedRefresh,
};

const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export const adminStore = {
  getState() {
    return state;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function loginAdmin(email) {
  state.isAuthed = true;
  state.email = email || "admin";
  notify();
}

export function setAdminTokens({ access, refresh, email }) {
  state.isAuthed = true;
  state.accessToken = access;
  state.refreshToken = refresh;
  state.email = email || "admin";
  localStorage.setItem("accessToken", access);
  localStorage.setItem("refreshToken", refresh);
  localStorage.setItem("adminEmail", state.email);
  notify();
}

export function logoutAdmin() {
  state.isAuthed = false;
  state.email = "admin";
  state.accessToken = "";
  state.refreshToken = "";
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("adminEmail");
  notify();
}
