import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import "../styles/authFlow.css";

export default function ForgotPassword() {
  const navigate = useNavigate();

  return (
    <div className="auth-flow-page">
      <div className="auth-flow-backdrop" />

      <div className="auth-flow-card auth-flow-card--verify">
        <div className="auth-flow-brand">
          <Logo width={200} />
        </div>

       
        <h1>Verify your access</h1>
        <p>
          Enter your email to receive a fast, secure recovery link and regain confidence in your workspace.
        </p>

        
        <label>Email</label>
        <input type="email" placeholder="company@email.com" />

        <button className="auth-flow-primary" type="button">
          Send verification
        </button>

        <button className="auth-flow-secondary" type="button" onClick={() => navigate("/login")}>
          Back to sign in
        </button>
      </div>
    </div>
  );
}
