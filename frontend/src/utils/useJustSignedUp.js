import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../components/toastContext";

/**
 * True on the first page after signup (the signup page navigates with { justSignedUp: true }).
 * Greets the new user once, then clears the flag from the history entry, so a reload or the
 * Back button doesn't greet them again.
 */
export default function useJustSignedUp() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [justSignedUp] = useState(() => !!location.state?.justSignedUp);
  const greeted = useRef(false); // effects run twice in development (StrictMode)

  useEffect(() => {
    if (!location.state?.justSignedUp || greeted.current) return;
    greeted.current = true;
    toast("Welcome to HireHub! Your account is ready.");
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, toast]);

  return justSignedUp;
}
