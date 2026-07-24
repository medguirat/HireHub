import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import "../styles/authFlow.css";

export default function CreateAccount() {
  const navigate = useNavigate();

  return (
    <div className="auth-flow-page">
      <div className="auth-flow-backdrop" />

      <div className="auth-flow-card auth-flow-card--signup">
        <div className="auth-flow-brand">
          <Logo width={150} />
        </div>

        
        <h1>Connecting ambition with opportunity</h1>
    

        <label>First Name</label>
        <input type="text" placeholder="Enter your first name " />

        <label>Last Name</label>
        <input type="text" placeholder="Enter your last name" />

        <label>Email</label>
        <input type="email" placeholder="company@email.com" />

        <label>Password</label>
        <input type="password" placeholder="••••••••" />

        <button className="auth-flow-primary" type="button">
          Create account
        </button>

        <button className="auth-flow-secondary" type="button" onClick={() => navigate("/login")}>
          Already have an account?
        </button>
      </div>
    </div>
  );
}
