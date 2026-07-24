import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import jobOfferLogin from "../images/JobOfferLogin.png";

export default function Login() {
  const navigate = useNavigate();

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

          <form>
            <label>Email</label>
            <input type="email" placeholder="company@email.com" />

            <label>Password</label>
            <input type="password" placeholder="••••••••" />

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

            <button className="login-button" type="submit">
              Sign In
            </button>
          </form>

          <div className="register-link">
            Don't have an account?
            <span onClick={() => navigate("/create-account")}>Create account</span>
          </div>
        </div>
      </div>
    </div>
  );
}