import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import readStoredUser from "../utils/storedUser";
import pageTitle from "./pageTitles";
import "../styles/recruiterDashboard.css";

export default function RecruiterLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  // Read once; ProtectedRoute has already checked the role.
  const [user, setUser] = useState(() => {
    const stored = readStoredUser();
    return stored?.role === "RECRUITER" ? stored : null;
  });

  // Only <main> scrolls (see .recruiter-layout): a new page opens at its top.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const companyName = user.recruiterProfile?.companyName || `${user.firstName} ${user.lastName}`;

  const { title, subtitle, hideBadge } = pageTitle(pathname);

  return (
    <div className="recruiter-layout">
      <Sidebar />

      <main className="recruiter-content" id="main-content" ref={mainRef} tabIndex={-1}>
        <div className="content-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {!hideBadge && <div className="user-badge">{companyName}</div>}
        </div>

        <Outlet context={{ user, setUser }} />
      </main>
    </div>
  );
}
