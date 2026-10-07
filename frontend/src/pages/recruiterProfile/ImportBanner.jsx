/** Where the import from the company website stands: in progress, done, or failed with "Try again". */
export default function ImportBanner({ companyImport, canRetry, onRetry }) {
  const { status, message, autoFilled, starting } = companyImport;

  if (status === "IN_PROGRESS") {
    return (
      <div className="import-banner import-banner--progress" role="status">
        <span className="import-spinner" aria-hidden="true" />
        <div>
          <strong>We're building your company profile from your website…</strong>
          <p>This usually takes a few seconds. You can keep editing: only empty fields will be filled.</p>
        </div>
      </div>
    );
  }
  if (status === "COMPLETED" && message) {
    return (
      <div className="import-banner" role="status">
        <div>
          <strong>{message}</strong>
          {autoFilled.size > 0 && <p>Imported fields are marked “From your website” until you edit them.</p>}
        </div>
      </div>
    );
  }
  if (status === "FAILED") {
    return (
      <div className="import-banner import-banner--failed" role="alert">
        <div><strong>{message || "We couldn't import your company details."}</strong></div>
        {canRetry && (
          <button type="button" className="secondary-btn" onClick={onRetry} disabled={starting}>
            {starting ? "Starting…" : "Try again"}
          </button>
        )}
      </div>
    );
  }
  return null;
}
