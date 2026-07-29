import { NavLink, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import Logo from "./Logo";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="recruiter-sidebar">
      <div className="sidebar-brand">
        <Logo width={160} />
      </div>

      <div className="sidebar-menu">
        <NavLink 
          to="/recruiter-dashboard" 
          end
          className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
        >
          Overview
        </NavLink>

        <NavLink 
          to="/recruiter-dashboard/offers" 
          className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
        >
          My Job Offers
        </NavLink>

        <NavLink 
          to="/recruiter-dashboard/applications" 
          className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
        >
          Applications
        </NavLink>

        <NavLink 
          to="/recruiter-dashboard/stats" 
          className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
        >
          Statistics
        </NavLink>

        <NavLink 
          to="/recruiter-dashboard/profile" 
          className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
        >
          Profile
        </NavLink>
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-item logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
