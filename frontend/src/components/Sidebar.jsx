import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import authService from "../services/authService";
import Logo from "./Logo";
import pageTitle from "../layouts/pageTitles";

// Labels come from the page titles, so the menu and the page headers always use the same words.
const RECRUITER_LINKS = ["/recruiter-dashboard", "/recruiter-dashboard/offers", "/recruiter-dashboard/applications",
  "/recruiter-dashboard/stats", "/recruiter-dashboard/profile"];
const CANDIDATE_LINKS = ["/candidate-dashboard", "/candidate-dashboard/offers", "/candidate-dashboard/applications",
  "/candidate-dashboard/profile"];

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
      <div className="sidebar-inner">
        <div className="sidebar-brand">
          <Logo width={160} />
          <button type="button" className="sidebar-toggle" aria-expanded={menuOpen} aria-controls="sidebar-menu"
            onClick={() => setMenuOpen((open) => !open)}>
            <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
            <span className="visually-hidden">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>

        <div className="sidebar-menu" id="sidebar-menu">
          {(isRecruiter ? RECRUITER_LINKS : CANDIDATE_LINKS).map((path, i) => (
            <NavLink key={path} to={path} end={i === 0}
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}>
              {pageTitle(path).title}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-item logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
