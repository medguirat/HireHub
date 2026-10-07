import { lazy, Suspense } from "react";
import { Missing, SectionCard } from "../../components/ProfileParts";
import { MAX_FILE_SIZE_MB } from "../../utils/files";
import { formatDate } from "../../utils/format";

// pdf.js is large: only loaded when a CV preview is shown.
const PdfPreview = lazy(() => import("../../components/PdfPreview"));

/** "My CV": the stored file, its preview (PDF) and the upload / replace button. */
export default function CvCard({ cv, url, pdf, uploading, error, onFile }) {
  const handleChange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) onFile(file);
  };

  return (
    <SectionCard id="cv" title="My CV"
      action={
        <label className="secondary-btn btn-compact file-button">
          {uploading ? "Uploading…" : cv ? "Replace" : "Upload"}
          <input id="profile-cv-input" type="file" accept=".pdf,.docx" onChange={handleChange} disabled={uploading}
            aria-label={cv ? "Replace your CV (PDF or DOCX)" : "Upload your CV (PDF or DOCX)"} />
        </label>
      }>
      {error && <span className="field-error" role="alert">{error}</span>}
      {cv ? (
        <>
          <div className="cv-file">
            <span className="cv-file__icon" aria-hidden="true">{cv.fileName?.toLowerCase().endsWith(".pdf") ? "PDF" : "DOC"}</span>
            <div className="grow">
              <div className="text-strong truncate">{cv.fileName}</div>
              {cv.uploadedAt && <div className="hint">Uploaded {formatDate(cv.uploadedAt)}</div>}
            </div>
            {url && (pdf
              ? <a className="cv-link text-sm" href={url} target="_blank" rel="noreferrer">Open</a>
              : <a className="cv-link text-sm" href={url} download={cv.fileName}>Download</a>)}
          </div>
          {pdf ? (
            <Suspense fallback={<p className="hint">Loading the preview…</p>}>
              <PdfPreview data={pdf} title={`Preview of ${cv.fileName}`} />
            </Suspense>
          ) : (
            <p className="hint">The preview is available for PDF files. Your DOCX CV is used for matching as it is.</p>
          )}
        </>
      ) : (
        <Missing>No CV yet. Upload one (PDF or DOCX, max {MAX_FILE_SIZE_MB} MB) to see how well you match each offer.</Missing>
      )}
    </SectionCard>
  );
}
