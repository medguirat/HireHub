import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import authService from "../services/authService";
import { errorMessage, fieldErrors } from "../utils/apiError";
import "../styles/authFlow.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAnswer("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter the email address of your account.");
      return;
    }
    setSending(true);
    try {
      // The same answer comes back whether or not the email has an account.
      const { message } = await authService.requestPasswordReset(email.trim());
      setAnswer(message);
    } catch (err) {
      setError(fieldErrors(err).email || errorMessage(err, "The link couldn't be sent. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="auth-flow-page">
      <div className="auth-flow-backdrop" />

      <form className="auth-flow-card auth-flow-card--verify" onSubmit={handleSubmit} noValidate>
        <div className="auth-flow-brand">
          <Logo width={200} />
        </div>

        <h1>Verify your access</h1>
        <p>
          Enter the email of your account. We'll send you a link to choose a new password.
        </p>

        <label htmlFor="forgot-email">Email</label>
        <input id="forgot-email" type="email" placeholder="company@email.com" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />

        <button className="auth-flow-primary" type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send reset link"}
        </button>

        {answer && <p className="auth-flow-hint" role="status">{answer}</p>}
        {error && <p className="error-message auth-flow-error" role="alert">{error}</p>}

        <button className="auth-flow-secondary" type="button" onClick={() => navigate("/login")}>
          Back to sign in
        </button>
      </form>
    </div>
  );
}
