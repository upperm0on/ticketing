import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { CalendarDays, LayoutDashboard, LogIn, LogOut, QrCode, Plus, Ticket } from "lucide-react";
import { adminStore, logoutAdmin } from "../store/adminStore.js";
import { userStore, logoutUser } from "../store/userStore.js";

export default function Navbar() {
  const [isCompact, setIsCompact] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const admin = useSyncExternalStore(adminStore.subscribe, () => adminStore.getState());
  const user = useSyncExternalStore(userStore.subscribe, userStore.getState);
  const isAdminArea = location.pathname.startsWith("/admin");

  useEffect(() => {
    const onScroll = () => {
      setIsCompact(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = useMemo(() => {
    if (admin.isAuthed) {
      return {
        label: admin.email || "admin",
        items: [
          { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/admin/events", label: "Events", icon: CalendarDays },
          { to: "/admin/verify", label: "Verify", icon: QrCode },
        ],
        cta: { to: "/admin/events/new", label: "New Event", icon: Plus },
        onLogout: logoutAdmin,
      };
    }

    return {
      label: user.email || "guest",
      items: [
        { to: "/", label: "Events", icon: Ticket },
        { to: "/login", label: "Login", icon: LogIn, hideWhenAuthed: true },
        { to: "/admin/login", label: "Admin", icon: LayoutDashboard, hideWhenAuthed: true },
      ],
      cta: null,
      onLogout: user.isAuthed ? logoutUser : null,
    };
  }, [admin, user]);

  const CtaIcon = nav.cta?.icon || null;
  const handleLogout = () => {
    const confirmed = window.confirm("Log out of this account?");
    if (!confirmed) return;
    const wasAdmin = admin.isAuthed;
    const wasUser = user.isAuthed;
    if (wasAdmin) {
      logoutAdmin();
      navigate("/admin/login");
      return;
    }
    if (wasUser) {
      logoutUser();
      navigate("/");
    }
  };

  return (
    <nav className={`app-nav ${isAdminArea ? "is-admin" : ""} ${isCompact ? "is-compact" : ""}`}>
      <div className="nav-group">
        {nav.items
          .filter((item) => !(item.hideWhenAuthed && user.isAuthed))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  `event-button is-ghost is-compact${isActive ? " is-active" : ""}`
                }
                to={item.to}
                title={item.label}
              >
                <Icon size={14} />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            );
          })}
      </div>

      <div className="nav-group nav-actions">
        <span className="nav-meta">{nav.label}</span>
        {nav.cta && (
          <NavLink
            className={({ isActive }) =>
              `event-button is-compact${isActive ? " is-active" : ""}`
            }
            to={nav.cta.to}
            title={nav.cta.label}
          >
            {CtaIcon && <CtaIcon size={14} />}
            <span className="nav-label">{nav.cta.label}</span>
          </NavLink>
        )}
        {nav.onLogout ? (
          <button className="event-button is-outline is-compact" type="button" onClick={handleLogout} title="Logout">
            <LogOut size={14} />
            <span className="nav-label">Logout</span>
          </button>
        ) : (
          <span className="nav-meta">Signed out</span>
        )}
      </div>
    </nav>
  );
}
