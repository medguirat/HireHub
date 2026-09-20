import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/recruiterDashboard.css";
import "../styles/candidateDashboard.css";

export default function CandidateLayout() {
  const navigate = useNavigate();
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
      <div className="loading-container" style={{ minHeight: "100vh", backgroundColor: "#0a1324" }}>
        <div>Loading candidate context...</div>
      </div>
    );
  }

  const displayName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="recruiter-layout">
      <Sidebar />
      
      <div className="recruiter-content">
        <div className="content-header">
          <div>
            <h1>Welcome back, {user.firstName}!</h1>
            <p>Explore opportunities and land your dream job with HireHub</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button 
              className="primary-btn" 
              onClick={() => navigate("/candidate-dashboard/offers")}
              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
            >
              Search Job Offers
            </button>
            <div className="user-badge">
              {displayName}
            </div>
          </div>
        </div>
        
        <Outlet context={{ user, setUser }} />
      </div>
    </div>
  );
}
