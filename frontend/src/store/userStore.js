const storedUserAccess = localStorage.getItem("userAccessToken") || "";
const storedUserRefresh = localStorage.getItem("userRefreshToken") || "";
const storedUserEmail = localStorage.getItem("userEmail") || "";

const state = {
    isAuthed: Boolean(storedUserAccess),
    email: storedUserEmail,
    accessToken: storedUserAccess,
    refreshToken: storedUserRefresh,
};

const listeners = new Set();

function notify() {
    listeners.forEach((listener) => listener());
}

export const userStore = {
    getState() {
        return state;
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};

export function loginUser({ access, refresh, email }) {
    state.isAuthed = true;
    state.accessToken = access;
    state.refreshToken = refresh;
    state.email = email;
    localStorage.setItem("userAccessToken", access);
    localStorage.setItem("userRefreshToken", refresh);
    localStorage.setItem("userEmail", email);
    notify();
}

export function logoutUser() {
    state.isAuthed = false;
    state.email = "";
    state.accessToken = "";
    state.refreshToken = "";
    localStorage.removeItem("userAccessToken");
    localStorage.removeItem("userRefreshToken");
    localStorage.removeItem("userEmail");
    notify();
}
