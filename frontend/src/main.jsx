import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.jsx";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const AppShell = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

root.render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        {AppShell}
      </GoogleOAuthProvider>
    ) : (
      AppShell
    )}
  </React.StrictMode>
);
