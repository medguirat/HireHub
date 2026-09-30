import { Suspense, lazy, useEffect, useState } from "react";
import { errorMessage } from "../utils/apiError";

const PdfPreview = lazy(() => import("./PdfPreview"));

/**
 * Shows a private PDF (a CV or cover letter) in a dialog, with Download and Open buttons.
 * `load` fetches it through the API with the login token; the Download and Open links point
 * to a local copy in the browser (a blob: URL), so no token ever appears in a URL.
 */
export default function DocumentViewer({ title, fileName, load, onClose }) {
  const [state, setState] = useState({ status: "loading", blob: null, url: "", error: "" });

  useEffect(() => {
    let ignore = false;
    let url = "";
    (async () => {
      try {
        const blob = await load();
        if (ignore) return;
        url = URL.createObjectURL(blob);
        setState({ status: "ready", blob, url, error: "" });
      } catch (err) {
        if (!ignore) setState({ status: "error", blob: null, url: "", error: errorMessage(err, "This file couldn't be opened.") });
      }
    })();
    return () => {
      ignore = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [load]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay modal-overlay--top" role="dialog" aria-modal="true" aria-labelledby="document-viewer-title">
      <div className="modal-content document-viewer">
        <div className="modal-header">
          <div className="grow">
            <h2 id="document-viewer-title">{title}</h2>
            {fileName && <p className="hint truncate">{fileName}</p>}
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {state.status === "loading" && <p className="hint" role="status">Loading the file…</p>}
          {state.status === "error" && <p className="field-error" role="alert">{state.error}</p>}
          {state.status === "ready" && (
            <Suspense fallback={<p className="hint">Loading the preview…</p>}>
              <PdfPreview data={state.blob} title={title} />
            </Suspense>
          )}
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>Close</button>
          {state.status === "ready" && (
            <>
              <a className="secondary-btn" href={state.url} target="_blank" rel="noreferrer">Open</a>
              <a className="primary-btn" href={state.url} download={fileName || "document.pdf"}>Download</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
