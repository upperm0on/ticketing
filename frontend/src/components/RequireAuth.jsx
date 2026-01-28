import { Navigate, useLocation } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { userStore } from "../store/userStore.js";

export default function RequireAuth({ children }) {
    const { isAuthed } = useSyncExternalStore(userStore.subscribe, userStore.getState);

    const location = useLocation();

    if (!isAuthed) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
