import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chrome } from "lucide-react";
import { setAdminTokens } from "../../store/adminStore.js";
import { loginAdmin } from "../../store/adminStore.js";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanUsername = username.trim();
    try {
      const response = await fetch(`${API_URL}/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password }),
      });
      if (!response.ok) {
        throw new Error("Login failed");
      }
      const data = await response.json();
      setAdminTokens({ access: data.access, refresh: data.refresh, email: cleanUsername });
      loginAdmin(cleanUsername);
      navigate("/admin/dashboard");
    } catch (error) {
      alert("Invalid credentials");
    }
  };

  return (
    <section className="page login-split-view">

      {/* Visual Side */}
      <div className="login-visual">
        <img
          src="https://images.unsplash.com/photo-1614850523060-8da1d56ae167?auto=format&fit=crop&q=80&w=1000"
          alt="Abstract Light"
        />
        <div className="login-visual-text dark">
          <p style={{ letterSpacing: '0.2em', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Staff Access</p>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '42px', lineHeight: '1' }}>The Control Room</h2>
        </div>
      </div>

      {/* Login Form Side */}
      <div className="login-form-wrapper">
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <p style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: 'var(--accent)',
            marginBottom: '16px'
          }}>
            ENTRÉE // Internal
          </p>
          <h2 style={{ fontSize: '32px' }}>Welcome Back</h2>
        </header>

        <form className="admin-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="admin"
              style={{
                width: '100%',
                padding: '16px 0',
                border: 'none',
                borderBottom: '1px solid #e0e0e0',
                fontFamily: 'var(--font-sans)',
                fontSize: '16px',
                outline: 'none',
                background: 'transparent',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Passcode</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '16px 0',
                border: 'none',
                borderBottom: '1px solid #e0e0e0',
                fontFamily: 'var(--font-sans)',
                fontSize: '16px',
                outline: 'none',
                background: 'transparent',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <button className="event-button is-full" type="submit">
              Authenticate
            </button>
          </div>

          <div style={{ position: 'relative', textAlign: 'center', marginTop: '16px' }}>
            <span style={{ background: '#fff', padding: '0 10px', fontSize: '12px', color: '#999', position: 'relative', zIndex: 1 }}>OR</span>
            <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', background: '#eee', zIndex: 0 }}></div>
          </div>

          <button
            type="button"
            className="event-button is-ghost is-full"
            onClick={() => alert("Google Login is disabled (Network Restrictions). Use: admin / password")}
          >
            <Chrome size={16} />
            Continue with Google
          </button>

        </form>
      </div>
    </section>
  );
}
