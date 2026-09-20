import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ allowedRole }) {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  if (!token || !storedUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(storedUser);
    if (allowedRole && user.role !== allowedRole) {
      const redirectPath = user.role === "RECRUITER" ? "/recruiter-dashboard" : "/candidate-dashboard";
      return <Navigate to={redirectPath} replace />;
    }
  } catch (e) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
