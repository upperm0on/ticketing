import { useSyncExternalStore } from "react";
import { Navigate } from "react-router-dom";
import { adminStore } from "../store/adminStore.js";

export default function RequireAdmin({ children }) {
  const { isAuthed } = useSyncExternalStore(adminStore.subscribe, () => adminStore.getState());

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
