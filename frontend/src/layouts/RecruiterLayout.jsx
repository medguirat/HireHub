import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import pageTitle from "./pageTitles";
import "../styles/recruiterDashboard.css";

export default function RecruiterLayout() {
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
      if (parsedUser.role !== "RECRUITER") {
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
        <div>Loading dashboard context...</div>
      </div>
    );
  }

  const companyName = user.recruiterProfile?.companyName || `${user.firstName} ${user.lastName}`;

  const { title, subtitle } = pageTitle(pathname);

  return (
    <div className="recruiter-layout">
      <Sidebar />
      
      <div className="recruiter-content">
        <div className="content-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="user-badge">
            {companyName}
          </div>
        </div>

        <Outlet context={{ user, setUser }} />
      </div>
    </div>
  );
}
