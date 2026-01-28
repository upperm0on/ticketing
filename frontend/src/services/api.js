const API_URL = import.meta.env.VITE_API_URL || '/api';

function authHeaders() {
    const token = localStorage.getItem("accessToken");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

async function parseErrorMessage(response, fallback) {
    try {
        const data = await response.json();
        return data?.detail || data?.error || data?.message || fallback;
    } catch {
        return fallback;
    }
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;
    const response = await fetch(`${API_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.access) {
        localStorage.setItem("accessToken", data.access);
        return data.access;
    }
    return null;
}

async function fetchWithAuth(url, options = {}, retry = true) {
    const accessToken = localStorage.getItem("accessToken");
    const headers = { ...(options.headers || {}) };
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }
    const response = await fetch(url, { ...options, headers });
    if (response.status !== 401 || !retry) return response;

    const newAccess = await refreshAccessToken();
    if (!newAccess) return response;

    const retryHeaders = { ...(options.headers || {}), Authorization: `Bearer ${newAccess}` };
    return fetch(url, { ...options, headers: retryHeaders });
}

export const fetchEvents = async () => {
    const response = await fetch(`${API_URL}/events/`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
};

export const fetchEventDetails = async (id) => {
    const response = await fetch(`${API_URL}/events/${id}/`);
    if (!response.ok) throw new Error('Failed to fetch event details');
    return response.json();
};

export const initializePayment = async (ticketData) => {
    const formData = new FormData();
    formData.append('event', ticketData.eventUuid);
    formData.append('ticket_type', ticketData.ticketTypeUuid);
    formData.append('full_name', ticketData.attendee.fullName);
    formData.append('email', ticketData.attendee.email);
    formData.append('age', ticketData.attendee.age);
    formData.append('phone', ticketData.attendee.phone);
    formData.append('quantity', ticketData.quantity || 1);

    if (ticketData.attendee.pictureFile) {
        formData.append('picture', ticketData.attendee.pictureFile);
    }

    const response = await fetch(`${API_URL}/tickets/initialize-payment/`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Ticket creation error:', errorData);
        throw new Error('Failed to initialize payment');
    }

    return response.json();
};

export const verifyPayment = async (reference) => {
    const response = await fetch(`${API_URL}/tickets/verify-payment/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
    });
    if (!response.ok) throw new Error('Payment verification failed');
    return response.json();
};

export const verifyTicket = async (code, eventId) => {
    const response = await fetchWithAuth(`${API_URL}/tickets/verify/?code=${code}&eventId=${eventId}`);
    if (!response.ok) throw new Error('Invalid ticket');
    return response.json();
};

export const checkInTicket = async (ticketId, adminEmail) => {
    const response = await fetchWithAuth(`${API_URL}/check-ins/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ticket: ticketId,
            checked_in_by: adminEmail,
        }),
    });
    if (!response.ok) throw new Error('Failed to check in');
    return response.json();
};

export const fetchTicketsByEvent = async (eventId) => {
    const response = await fetchWithAuth(`${API_URL}/tickets/?event=${eventId}`);
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
};

export const fetchAllTickets = async () => {
    const response = await fetchWithAuth(`${API_URL}/tickets/`);
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
};

export const saveEvent = async (eventData, mode = 'new') => {
    const method = mode === 'new' ? 'POST' : 'PATCH';
    const url = mode === 'new' ? `${API_URL}/events/` : `${API_URL}/events/${eventData.id}/`;

    // Flattened data for JSON
    const payload = {
        title: eventData.title,
        date_time: eventData.dateTime,
        venue: eventData.venue,
        description: eventData.description,
        status: eventData.status,
        ticket_types: eventData.ticket_types.map(tt => ({
            id: tt.id && tt.id.startsWith('tt-') ? undefined : tt.id, // Remove client-side temp IDs
            name: tt.name,
            price: tt.price,
            limit: tt.limit
        }))
    };

    const hasFlyer = Boolean(eventData.flyerFile);
    const response = await fetchWithAuth(url, {
        method,
        headers: hasFlyer ? { ...authHeaders() } : { 'Content-Type': 'application/json', ...authHeaders() },
        body: hasFlyer
            ? (() => {
                const formData = new FormData();
                formData.append('title', eventData.title);
                formData.append('date_time', eventData.dateTime);
                formData.append('venue', eventData.venue);
                formData.append('description', eventData.description || '');
                formData.append('status', eventData.status);
                formData.append('ticket_types', JSON.stringify(payload.ticket_types));
                formData.append('flyer', eventData.flyerFile);
                return formData;
            })()
            : JSON.stringify(payload),
    });

    if (!response.ok) {
        let message = 'Failed to save event';
        try {
            const errorData = await response.json();
            message = errorData?.detail || errorData?.error || message;
        } catch {
            // ignore parse errors
        }
        throw new Error(message);
    }
    const savedEvent = await response.json();

    return savedEvent;
};

export const deleteEvent = async (eventId) => {
    const response = await fetchWithAuth(`${API_URL}/events/${eventId}/`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
    });
    if (!response.ok) {
        const message = await parseErrorMessage(response, 'Failed to delete event');
        throw new Error(message);
    }
    return true;
};

export const updateEventStatus = async (eventId, status) => {
    const response = await fetchWithAuth(`${API_URL}/events/${eventId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status }),
    });
    if (!response.ok) {
        const message = await parseErrorMessage(response, 'Failed to update status');
        throw new Error(message);
    }
    return response.json();
};

export const resendTicketCode = async (ticketId) => {
    const response = await fetch(`${API_URL}/tickets/${ticketId}/resend-code/`, {
        method: 'POST',
        headers: { ...authHeaders() },
    });
    if (!response.ok) throw new Error('Failed to resend code');
    return response.json();
};
