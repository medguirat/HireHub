import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import authService, { dashboardFor } from "../services/authService";
import AlertModal from "../components/AlertModal";
import "../styles/login.css";
import jobOfferLogin from "../images/JobOfferLogin.png";
import { errorMessage } from "../utils/apiError";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  // A notice passed by the signup page, or the flag left by an expired session.
  const [sessionNotice] = useState(() => {
    if (location.state?.notice) return location.state.notice;
    return sessionStorage.getItem("hirehub.sessionExpired") ? "Your session has expired. Please log in again." : "";
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const user = await authService.login(email, password);
      navigate(dashboardFor(user.role), { replace: true });
    } catch (err) {
      console.error(err);
      setErrorMsg(errorMessage(err, "Invalid email or password."));
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={jobOfferLogin} alt="Job offer illustration" className="login-illustration" />
        <h1>Hire Smarter.</h1>
        <h2>Recruit Faster.</h2>
        <p>
          Connect recruiters with exceptional talent through an intelligent recruitment platform.
        </p>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>Welcome Back</h2>
          <p>Sign in to continue using HireHub</p>

          {sessionNotice && (
            <div className="session-notice" role="status">{sessionNotice}</div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <label>Email</label>
            <input 
              type="email" 
              placeholder="company@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="new-email"
            />

            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <a
              href="/forgot-password"
              className="forgot-link"
              onClick={(e) => {
                e.preventDefault();
                navigate("/forgot-password");
              }}
            >
              Forgot password?
            </a>

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="register-link">
            Don't have an account?
            <span onClick={() => navigate("/create-account")}>Create account</span>
          </div>
        </div>
      </div>

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Authentication Failed"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}