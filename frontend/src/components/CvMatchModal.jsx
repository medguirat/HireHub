import { useCallback, useEffect, useState } from "react";
import candidateService from "../services/candidateService";
import "../styles/cvMatch.css";
import { formatDate } from "../utils/format";

// Keep in sync with the backend's spring.servlet.multipart.max-file-size.
const MAX_FILE_SIZE_MB = 10;
const ACCEPTED = [".pdf", ".docx"];

const CATEGORY_LABELS = {
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  languages: "Languages",
  relevance: "Relevance to the role"
};

function validateCv(file) {
  const name = file.name.toLowerCase();
  if (!ACCEPTED.some((ext) => name.endsWith(ext))) {
    return "Please choose a PDF or DOCX file.";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB — please choose one under ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

function band(score) {
  if (score >= 75) return { key: "strong", label: "Strong match" };
  if (score >= 40) return { key: "partial", label: "Partial match" };
  return { key: "low", label: "Low match" };
}


function ScoreRing({ score }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const { key } = band(score);
  return (
    <svg className={`match-ring match-ring--${key}`} viewBox="0 0 100 100" role="img" aria-label={`Match score ${score} out of 100`}>
      <circle className="match-ring__track" cx="50" cy="50" r={radius} />
      <circle
        className="match-ring__value"
        cx="50"
        cy="50"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
      />
      <text x="50" y="46" className="match-ring__number">{score}</text>
      <text x="50" y="69" className="match-ring__unit">/ 100</text>
    </svg>
  );
}

function CategoryRow({ name, category }) {
  if (!category.applicable) {
    return (
      <div className="match-category match-category--na">
        <div className="match-category__head">
          <span>{CATEGORY_LABELS[name]}</span>
          <span className="match-category__weight">not required by this offer</span>
        </div>
        <p className="match-category__summary">{category.summary}</p>
      </div>
    );
  }
  return (
    <div className="match-category">
      <div className="match-category__head">
        <span>{CATEGORY_LABELS[name]}</span>
        <span className="match-category__score">
          {category.score}
          <span className="match-category__weight"> · {Math.round(category.effective_weight * 100)}% of the score</span>
        </span>
      </div>
      <progress className={`match-bar match-bar--${band(category.score).key}`} max="100" value={category.score}
        aria-hidden="true" />
      <p className="match-category__summary">{category.summary}</p>
    </div>
  );
}

function SkillChips({ skills }) {
  const nothing = !skills.matched.length && !skills.partial.length &&
    !skills.missing_required.length && !skills.missing_nice_to_have.length;
  if (nothing) return <p className="match-muted">This offer doesn't list skills the analysis recognizes.</p>;
  return (
    <div className="match-chips">
      {skills.matched.map((s) => (
        <span key={`m-${s.skill}`} className="match-chip match-chip--ok" title={s.via ? `Implied by ${s.via}` : undefined}>
          ✓ {s.skill}{s.requirement === "nice_to_have" ? " (bonus)" : ""}
        </span>
      ))}
      {skills.partial.map((s) => (
        <span key={`p-${s.skill}`} className="match-chip match-chip--partial">
          ≈ {s.skill} <small>you have {s.via}</small>
        </span>
      ))}
      {skills.missing_required.map((name) => (
        <span key={`r-${name}`} className="match-chip match-chip--missing">✕ {name}</span>
      ))}
      {skills.missing_nice_to_have.map((name) => (
        <span key={`n-${name}`} className="match-chip match-chip--bonus">+ {name} <small>nice to have</small></span>
      ))}
    </div>
  );
}

/**
 * Scores the candidate's stored CV against one offer. The score comes only
 * from the backend; if it can't be computed the modal says so and offers a
 * retry - it never shows an estimate.
 */
export default function CvMatchModal({ offer, onClose, onApply, canApply }) {
  const [phase, setPhase] = useState("loading"); // loading | upload | matching | result | error
  const [cv, setCv] = useState(null);
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showMethod, setShowMethod] = useState(false);

  const runMatch = useCallback(async () => {
    setPhase("matching");
    setError("");
    try {
      setMatch(await candidateService.getOfferMatch(offer.id));
      setPhase("result");
    } catch (err) {
      const status = err.response?.status;
      if (status === 409 && err.response?.data?.code === "CV_REQUIRED") {
        setPhase("upload");
        return;
      }
      setError(
        err.response?.data?.message ||
        (err.response ? "The match couldn't be computed." : "Can't reach the server. Check your connection.")
      );
      setPhase("error");
    }
  }, [offer.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await candidateService.getMyCv();
        if (cancelled) return;
        setCv(stored);
        runMatch();
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setPhase("upload");
        } else {
          setError(err.response?.data?.message || "Your CV couldn't be loaded.");
          setPhase("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [runMatch]);

  const handleFile = (e) => {
    const chosen = e.target.files[0] || null;
    setFile(chosen);
    setFileError(chosen ? validateCv(chosen) || "" : "");
  };

  const handleUpload = async () => {
    if (!file || fileError) return;
    setUploading(true);
    setFileError("");
    try {
      setCv(await candidateService.uploadMyCv(file));
      setFile(null);
      await runMatch();
    } catch (err) {
      setFileError(err.response?.data?.message || "Your CV couldn't be uploaded. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const result = match?.result;
  const verdict = result ? band(result.overall_score) : null;

  return (
    <div className="modal-overlay match-overlay" role="dialog" aria-modal="true" aria-labelledby="match-title">
      <div className="modal-content match-modal">
        <div className="match-modal__header">
          <div>
            <h2 id="match-title">CV match</h2>
            <p>How your CV compares with <strong>{offer.title}</strong></p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="match-modal__body">
          {(phase === "loading" || phase === "matching") && (
            <div className="match-state" role="status">
              <div className="match-spinner" />
              <p>{phase === "loading" ? "Loading your CV…" : "Comparing your CV with this offer…"}</p>
            </div>
          )}

          {phase === "upload" && (
            <div className="match-upload">
              <p>
                {cv
                  ? "Upload a new version of your CV. It replaces the current one for all offers."
                  : "Upload your CV once; it will be compared with any offer you open."}
              </p>
              <label className="match-upload__label" htmlFor="match-cv-input">
                CV file (PDF or DOCX, max {MAX_FILE_SIZE_MB} MB)
              </label>
              <input id="match-cv-input" type="file" accept=".pdf,.docx" onChange={handleFile} />
              {fileError && <p className="match-error-text" role="alert">{fileError}</p>}
              <div className="match-upload__actions">
                {cv && (
                  <button className="secondary-btn" onClick={runMatch} disabled={uploading}>
                    Keep current CV
                  </button>
                )}
                <button className="primary-btn" onClick={handleUpload} disabled={!file || !!fileError || uploading}>
                  {uploading ? "Uploading…" : "Upload and compare"}
                </button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="match-state match-state--error" role="alert">
              <p className="match-state__title">No score available right now</p>
              <p>{error}</p>
              <button className="primary-btn" onClick={runMatch}>Try again</button>
            </div>
          )}

          {phase === "result" && result && (
            <div className="match-result">
              <div className="match-cvbar">
                <span>
                  Your CV: <strong>{match.cvFileName}</strong>
                  {cv?.uploadedAt && <> · uploaded {formatDate(cv.uploadedAt)}</>}
                </span>
                <button className="link-btn" onClick={() => { setFile(null); setFileError(""); setPhase("upload"); }}>
                  Replace CV
                </button>
              </div>

              <div className={`match-summary match-summary--${verdict.key}`}>
                <ScoreRing score={result.overall_score} />
                <div>
                  <h3>{verdict.label}</h3>
                  <p>{result.categories.skills.summary}</p>
                  <p className="match-muted">
                    {match.cached ? `Calculated ${formatDate(match.computedAt)} for this CV version.` : "Just calculated."}
                  </p>
                </div>
              </div>

              <section>
                <h4>Score breakdown</h4>
                {Object.keys(CATEGORY_LABELS).map((name) => (
                  <CategoryRow key={name} name={name} category={result.categories[name]} />
                ))}
                <button className="link-btn" onClick={() => setShowMethod(!showMethod)} aria-expanded={showMethod}>
                  {showMethod ? "Hide how this is calculated" : "How is this calculated?"}
                </button>
                {showMethod && (
                  <p className="match-muted match-method">
                    The score is a weighted average: skills 45%, experience 20%, relevance 15%, education 10%,
                    languages 10%. Categories the offer doesn't mention are left out and the others re-weighted.
                    Only experience in roles that use the offer's skills counts. Relevance compares each statement of
                    the offer with your CV's content. Suggestions are written after the score and never change it.
                  </p>
                )}
              </section>

              <section>
                <h4>Skills</h4>
                <SkillChips skills={result.skills} />
              </section>

              <section>
                <h4>How to improve your application</h4>
                <ol className="match-recs">
                  {result.recommendations.map((rec) => <li key={rec}>{rec}</li>)}
                </ol>
                <p className="match-muted">
                  {result.recommendations_source === "llm"
                    ? "Suggestions written by a local AI model from the gaps above."
                    : "Suggestions generated from the gaps above."}
                </p>
              </section>
            </div>
          )}
        </div>

        <div className="match-modal__footer">
          <button className="secondary-btn" onClick={onClose}>Close</button>
          {phase === "result" && canApply && (
            <button className="primary-btn" onClick={onApply}>Apply to this offer</button>
          )}
        </div>
      </div>
    </div>
  );
}
