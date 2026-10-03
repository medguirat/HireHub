import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import recruiterService from "../services/recruiterService";

const POLL_MS = 3000;
const PROFILE = "/recruiter-dashboard/profile";

/**
 * The company import started at signup, seen from the recruiter's overview: a progress banner while
 * it runs, then its result with a link to review the profile. The result is shown only if the
 * import finished while this page was open, or right after signup; afterwards the profile page
 * (which also offers "Try again") is where it lives.
 */
export default function CompanyImportNotice({ justSignedUp = false }) {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    let active = true;
    let timer = null;
    const load = async () => {
      try {
        const p = await recruiterService.getProfile();
        if (!active) return;
        setStatus(p.companyImportStatus || "NOT_REQUESTED");
        setMessage(p.companyImportMessage || "");
        if (p.companyImportStatus === "IN_PROGRESS") {
          setWatched(true);
          timer = setTimeout(load, POLL_MS);
        }
      } catch (err) {
        // The overview works without it; the profile page shows the import too.
        console.error("Failed to load the company import status:", err);
      }
    };
    load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  if (status === "IN_PROGRESS") {
    return (
      <div className="import-banner import-banner--progress" role="status">
        <span className="import-spinner" aria-hidden="true" />
        <div>
          <strong>We're building your company profile from your website…</strong>
          <p>This usually takes a few seconds. You can keep using HireHub; the result will appear here.</p>
        </div>
      </div>
    );
  }
  if (!(watched || justSignedUp)) return null;
  if (status === "COMPLETED" && message) {
    return (
      <div className="import-banner" role="status">
        <div><strong>{message}</strong></div>
        <Link className="secondary-btn" to={PROFILE}>Review my company profile</Link>
      </div>
    );
  }
  if (status === "FAILED") {
    return (
      <div className="import-banner import-banner--failed" role="alert">
        <div><strong>{message || "We couldn't import your company details."}</strong></div>
        <Link className="secondary-btn" to={PROFILE}>Open my company profile</Link>
      </div>
    );
  }
  return null;
}
