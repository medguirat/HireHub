import { useEffect, useState } from "react";
import candidateService from "../../services/candidateService";
import { validateFile } from "../../utils/files";
import { errorMessage } from "../../utils/apiError";

/**
 * The candidate's stored CV (used for matching): its details, a local copy for the preview and the
 * download link, and the upload. The file is private, so it is fetched through the API and kept in
 * the browser as a blob: URL, never opened through a public link.
 */
export default function useMyCv({ onUploaded } = {}) {
  const [cv, setCv] = useState(null);
  const [url, setUrl] = useState("");
  const [pdf, setPdf] = useState(null); // the PDF itself, for the preview; null for a DOCX
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const meta = await candidateService.getMyCv();
        if (!ignore) setCv(meta);
        const isPdf = meta.fileName?.toLowerCase().endsWith(".pdf");
        const blob = new Blob([await candidateService.getMyCvFile()], {
          type: isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        if (!ignore) setPdf(isPdf ? blob : null);
        if (!ignore) setUrl(URL.createObjectURL(blob));
      } catch (err) {
        if (err.response?.status !== 404) console.error(err);
        if (!ignore) setCv(null);
        if (!ignore) setPdf(null);
        if (!ignore) setUrl("");
      }
    })();
    return () => { ignore = true; };
  }, [reloadKey]);

  // Free the previous local copy when it is replaced or the page closes.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const upload = async (file) => {
    const problem = validateFile(file, [".pdf", ".docx"]);
    setError(problem || "");
    if (problem) return;
    setUploading(true);
    try {
      await candidateService.uploadMyCv(file);
      setReloadKey((k) => k + 1);
      onUploaded?.();
    } catch (err) {
      setError(errorMessage(err, "Your CV couldn't be uploaded. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  return { cv, url, pdf, uploading, error, upload };
}
