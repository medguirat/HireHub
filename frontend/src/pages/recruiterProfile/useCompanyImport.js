import { useCallback, useEffect, useState } from "react";
import recruiterService from "../../services/recruiterService";
import { errorMessage } from "../../utils/apiError";
import { normalizeUrl } from "../../utils/profile";

const POLL_MS = 3000;

/**
 * The company details imported from the website (at signup or on request): the import's status
 * and message, which fields it filled ("From your website" until the user edits them), polling
 * while it runs, and starting a new one. When an import finishes, only fields still empty in the
 * form are filled, so nothing typed meanwhile is overwritten.
 */
export default function useCompanyImport({ setProfile, setForm, onError }) {
  const [status, setStatus] = useState("NOT_REQUESTED");
  const [message, setMessage] = useState("");
  const [autoFilled, setAutoFilled] = useState(() => new Set());
  const [starting, setStarting] = useState(false);

  /** Takes the import state from a profile the API returned. */
  const apply = useCallback((p) => {
    setStatus(p.companyImportStatus || "NOT_REQUESTED");
    setMessage(p.companyImportMessage || "");
    setAutoFilled(new Set(p.autoFilledFields || []));
  }, []);

  useEffect(() => {
    if (status !== "IN_PROGRESS") return undefined;
    const timer = setInterval(async () => {
      try {
        const p = await recruiterService.getProfile();
        if (p.companyImportStatus === "IN_PROGRESS") return;
        setProfile(p);
        setForm((prev) => {
          const next = { ...prev };
          for (const field of p.autoFilledFields || []) {
            if (next[field] === "" || next[field] == null) next[field] = p[field] ?? "";
          }
          return next;
        });
        apply(p);
      } catch (err) {
        console.error("Failed to refresh the company import status:", err);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [status, apply, setProfile, setForm]);

  /** The user edited this field: it no longer shows "From your website". */
  const unmark = (name) => setAutoFilled((prev) => {
    if (!prev.has(name)) return prev;
    const next = new Set(prev);
    next.delete(name);
    return next;
  });

  const start = async (website) => {
    setStarting(true);
    try {
      const p = await recruiterService.importCompanyFromWebsite(normalizeUrl(website));
      apply(p);
      setForm((prev) => ({ ...prev, website: p.website || prev.website }));
    } catch (err) {
      console.error(err);
      onError(errorMessage(err, "We couldn't start the import. Please try again."));
    } finally {
      setStarting(false);
    }
  };

  return { status, message, autoFilled, setAutoFilled, starting, apply, unmark, start };
}
