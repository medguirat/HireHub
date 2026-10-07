import { Navigate, Outlet } from "react-router-dom";
import readStoredUser from "../utils/storedUser";

// Client-side routing guard only: the API checks the session and the role on every request.
// The user saved at login says who is signed in; if the session cookie has expired since, the
// first API call answers 401 and the app goes back to the login page.
export default function ProtectedRoute({ allowedRole }) {
  const user = readStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRole && user.role !== allowedRole) {
    const home = user.role === "RECRUITER" ? "/recruiter-dashboard" : "/candidate-dashboard";
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
}
