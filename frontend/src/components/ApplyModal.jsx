import { useState } from "react";
import candidateService from "../services/candidateService";
import { MAX_FILE_SIZE_MB, validateFile } from "../utils/files";
import { errorMessage } from "../utils/apiError";
import fileService from "../services/fileService";

/** The application form (CV + cover letter) for one offer; used wherever a candidate can apply. */
export default function ApplyModal({ offer, onClose, onApplied }) {
  const [cvFile, setCvFile] = useState(null);
  const [cvFileError, setCvFileError] = useState("");
  const [coverLetterType, setCoverLetterType] = useState("text");
  const [coverLetterText, setCoverLetterText] = useState("");
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [coverLetterFileError, setCoverLetterFileError] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!cvFile) {
      setCvFileError("Choose your CV (PDF) to apply.");
      return;
    }
    // The inputs already block bad files; never trust client state alone.
    const cvError = validateFile(cvFile, [".pdf"]);
    const clError = coverLetterType === "file" ? validateFile(coverLetterFile, [".pdf"]) : null;
    if (cvError || clError) {
      setCvFileError(cvError || "");
      setCoverLetterFileError(clError || "");
      return;
    }

    setApplying(true);
    try {
      // The files are stored privately; the application refers to them by id.
      const cv = await fileService.uploadDocument(cvFile);
      const letterFile = coverLetterType === "file" && coverLetterFile
        ? await fileService.uploadDocument(coverLetterFile) : null;
      await candidateService.createApplication({
        jobOfferId: offer.id,
        cvFileId: cv.id,
        coverLetter: coverLetterType === "text" ? coverLetterText : "",
        coverLetterFileId: letterFile?.id,
      });
      onApplied(offer);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Your application couldn't be sent. Please try again."));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="modal-overlay modal-overlay--top">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Apply for {offer.title}</h2>
          <button className="close-btn" onClick={onClose} disabled={applying} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>CV / Resume (PDF only, max {MAX_FILE_SIZE_MB} MB) *</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                setCvFile(file || null);
                setCvFileError(file ? validateFile(file, [".pdf"]) || "" : "");
              }}
              className="file-input"
            />
            {cvFileError ? (
              <span className="field-error">{cvFileError}</span>
            ) : (
              <small className="hint">Upload a PDF version of your CV.</small>
            )}
          </div>

          <div className="form-group">
            <label>Cover letter</label>
            <div className="radio-row">
              <label className="radio-option">
                <input type="radio" name="coverLetterType" checked={coverLetterType === "text"}
                  onChange={() => setCoverLetterType("text")} />
                Write letter
              </label>
              <label className="radio-option">
                <input type="radio" name="coverLetterType" checked={coverLetterType === "file"}
                  onChange={() => setCoverLetterType("file")} />
                Upload PDF file
              </label>
            </div>

            {coverLetterType === "text" ? (
              <textarea
                rows="5"
                placeholder="Introduce yourself and say why this role interests you..."
                value={coverLetterText}
                onChange={(e) => setCoverLetterText(e.target.value)}
              />
            ) : (
              <>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setCoverLetterFile(file || null);
                    setCoverLetterFileError(file ? validateFile(file, [".pdf"]) || "" : "");
                  }}
                  className="file-input"
                />
                {coverLetterFileError && <span className="field-error">{coverLetterFileError}</span>}
              </>
            )}
          </div>

          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose} disabled={applying}>
            Cancel
          </button>
          <button className="primary-btn" onClick={submit} disabled={applying || !!cvFileError || !!coverLetterFileError}>
            {applying ? "Sending…" : "Send application"}
          </button>
        </div>
      </div>
    </div>
  );
}
