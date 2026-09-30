import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import pageTitle from "./pageTitles";
import "../styles/recruiterDashboard.css";
import "../styles/candidateDashboard.css";

export default function CandidateLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "CANDIDATE") {
        navigate("/login", { replace: true }); 
        return;
      }
      setUser(parsedUser);
    } catch (e) {
      localStorage.clear();
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  if (!user) {
    return (
      <div className="loading-container full-screen-loading">
        <div>Loading candidate context...</div>
      </div>
    );
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
