import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/recruiterDashboard.css";

export default function RecruiterLayout() {
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
      <div className="loading-container" style={{ minHeight: "100vh", backgroundColor: "#0a1324" }}>
        <div>Loading dashboard context...</div>
      </div>
    );
  }

  const companyName = user.recruiterProfile?.companyName || `${user.firstName} ${user.lastName}`;

  return (
    <div className="recruiter-layout">
      <Sidebar />
      
      <div className="recruiter-content">
        <div className="content-header">
          <div>
            <h1>Welcome ! </h1>
            <p>Recruit faster, build stronger teams with HireHub</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button 
              className="primary-btn" 
              onClick={() => navigate("/recruiter-dashboard/create-offer")}
              style={{ padding: "8px 16px", fontSize: "0.85rem" }}
            >
              + Create a New Job Offer
            </button>
            <div className="user-badge">
              {companyName}
            </div>
          </div>
        </div>
        
        
        <Outlet context={{ user, setUser }} />
      </div>
    </div>
  );
}
