import { Routes, Route, Navigate } from "react-router-dom";
import EventList from "./pages/EventList.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import Checkout from "./pages/Checkout.jsx";
import PaymentStart from "./pages/PaymentStart.jsx";
import TicketSuccess from "./pages/TicketSuccess.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminEventsList from "./pages/admin/AdminEventsList.jsx";
import AdminEventForm from "./pages/admin/AdminEventForm.jsx";
import AdminAttendees from "./pages/admin/AdminAttendees.jsx";
import AdminTickets from "./pages/admin/AdminTickets.jsx";
import AdminVerify from "./pages/admin/AdminVerify.jsx";
import UserLogin from "./pages/UserLogin.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireAdmin from "./components/RequireAdmin.jsx";
import Navbar from "./components/Navbar.jsx";


export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <h1>ENTRÉE</h1>
          <div className="brand-subtitle">SELECT TICKETING</div>
        </div>
        <Navbar />
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<EventList />} />
          <Route path="/events/:eventId" element={<EventDetails />} />
          <Route path="/login" element={<UserLogin />} />
          <Route
            path="/checkout/:eventId"
            element={
              <RequireAuth>
                <Checkout />
              </RequireAuth>
            }
          />
          <Route path="/payment/start" element={<PaymentStart />} />
          <Route path="/ticket/success/:ticketId" element={<TicketSuccess />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/events"
            element={
              <RequireAdmin>
                <AdminEventsList />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/events/new"
            element={
              <RequireAdmin>
                <AdminEventForm mode="new" />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/events/:id/edit"
            element={
              <RequireAdmin>
                <AdminEventForm mode="edit" />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/events/:id/attendees"
            element={
              <RequireAdmin>
                <AdminAttendees />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/events/:id/tickets"
            element={
              <RequireAdmin>
                <AdminTickets />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/verify"
            element={
              <RequireAdmin>
                <AdminVerify />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
