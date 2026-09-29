import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import Logo from "./Logo";

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Small screens: the menu collapses behind a button in the top bar.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isRecruiter = user?.role === "RECRUITER";

  const handleLogout = () => {
    authService.logout();
    window.history.pushState(null, "", "/login");
    navigate("/login", { replace: true });
  };

  return (
    <nav className={`recruiter-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Main">
      <div className="sidebar-brand">
        <Logo width={160} />
        <button type="button" className="sidebar-toggle" aria-expanded={menuOpen} aria-controls="sidebar-menu"
          onClick={() => setMenuOpen((open) => !open)}>
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
          <span className="visually-hidden">{menuOpen ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <div className="sidebar-menu" id="sidebar-menu">
        {isRecruiter ? (
          <>
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
          </>
        ) : (
          <>
            <NavLink 
              to="/candidate-dashboard" 
              end
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              Overview
            </NavLink>

            <NavLink 
              to="/candidate-dashboard/offers" 
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              Browse Offers
            </NavLink>

            <NavLink 
              to="/candidate-dashboard/applications" 
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              My Applications
            </NavLink>

            <NavLink 
              to="/candidate-dashboard/profile" 
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              Profile
            </NavLink>
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-item logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </nav>
  );
}
