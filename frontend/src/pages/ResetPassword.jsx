import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import authService from "../services/authService";
import { errorCode, errorMessage, fieldErrors } from "../utils/apiError";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "../utils/password";
import "../styles/authFlow.css";

/** The link in the email is /reset-password#token=…: the part after "#" never reaches a server. */
function tokenFromLink() {
  return new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token] = useState(tokenFromLink);
  // "checking" -> "ready" | "invalid"
  const [linkState, setLinkState] = useState(token ? "checking" : "invalid");
  const [linkError, setLinkError] = useState(token ? "" : "This reset link is incomplete. Please ask for a new one.");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Take the token out of the address bar (and so out of the history) once it's been read.
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let ignore = false;
    (async () => {
      try {
        await authService.checkResetLink(token);
        if (!ignore) setLinkState("ready");
      } catch (err) {
        if (ignore) return;
        setLinkState("invalid");
        setLinkError(errorMessage(err, "This reset link can't be checked right now. Please try again."));
      }
    })();
    return () => { ignore = true; };
  }, [token]);

  const errors = submitted ? { ...serverErrors, ...validateNewPassword(password, confirmation) } : {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerErrors({});
    setError("");
    if (Object.keys(validateNewPassword(password, confirmation)).length > 0) return;
    setSaving(true);
    try {
      await authService.resetPassword(token, password);
      authService.logout(); // any session in this browser was signed out by the reset
      navigate("/login", { replace: true, state: { notice: "Your password has been changed. Log in with your new password." } });
    } catch (err) {
      if (errorCode(err) === "RESET_LINK_INVALID") {
        setLinkState("invalid");
        setLinkError(errorMessage(err, "This reset link can no longer be used."));
      } else {
        setServerErrors(fieldErrors(err));
        setError(Object.keys(fieldErrors(err)).length ? "" : errorMessage(err, "Your password couldn't be changed. Please try again."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-flow-page">
      <div className="auth-flow-backdrop" />

      <form className="auth-flow-card auth-flow-card--verify" onSubmit={handleSubmit} noValidate>
        <div className="auth-flow-brand">
          <Logo width={200} />
        </div>

        <h1>Choose a new password</h1>

        {linkState === "checking" && <p role="status">Checking your link…</p>}

        {linkState === "invalid" && (
          <>
            <p className="error-message auth-flow-error" role="alert">{linkError}</p>
            <button className="auth-flow-primary" type="button" onClick={() => navigate("/forgot-password")}>
              Ask for a new link
            </button>
          </>
        )}

        {linkState === "ready" && (
          <>
            <p>It must have at least {MIN_PASSWORD_LENGTH} characters. You'll be signed out everywhere else.</p>

            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "new-password-error" : undefined} />
            {errors.password && <p id="new-password-error" className="error-message auth-flow-error">{errors.password}</p>}

            <label htmlFor="confirm-password">Repeat the new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)} aria-invalid={!!errors.confirmation}
              aria-describedby={errors.confirmation ? "confirm-password-error" : undefined} />
            {errors.confirmation && <p id="confirm-password-error" className="error-message auth-flow-error">{errors.confirmation}</p>}

            <button className="auth-flow-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save the new password"}
            </button>
            {error && <p className="error-message auth-flow-error" role="alert">{error}</p>}
          </>
        )}

        <button className="auth-flow-secondary" type="button" onClick={() => navigate("/login")}>
          Back to sign in
        </button>
      </form>
    </div>
  );
}
