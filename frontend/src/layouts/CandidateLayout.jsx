import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import readStoredUser from "../utils/storedUser";
import pageTitle from "./pageTitles";
import "../styles/recruiterDashboard.css";
import "../styles/candidateDashboard.css";

export default function CandidateLayout() {
  const { pathname } = useLocation();
  // Read once; ProtectedRoute has already checked the role.
  const [user, setUser] = useState(() => {
    const stored = readStoredUser();
    return stored?.role === "CANDIDATE" ? stored : null;
  });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const displayName = `${user.firstName} ${user.lastName}`;

  const { title, subtitle, hideBadge } = pageTitle(pathname);

  return (
    <div className="recruiter-layout">
      <Sidebar />
      
      <div className="recruiter-content">
        <div className="content-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {!hideBadge && <div className="user-badge">{displayName}</div>}
        </div>

        <Outlet context={{ user, setUser }} />
      </div>
    </div>
  );
}
