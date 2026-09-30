import { Navigate, Outlet } from "react-router-dom";
import readStoredUser from "../utils/storedUser";

// Client-side routing guard only: the API checks the token and role on every request.
export default function ProtectedRoute({ allowedRole }) {
  const token = localStorage.getItem("token");
  const user = token ? readStoredUser() : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRole && user.role !== allowedRole) {
    const home = user.role === "RECRUITER" ? "/recruiter-dashboard" : "/candidate-dashboard";
    return <Navigate to={home} replace />;
  }
  return <Outlet />;
}
