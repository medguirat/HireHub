import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/toastContext";
import { formatDate, formatDateTime } from "../utils/format";

export default function CandidateRating() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const toast = useToast();
  const { user } = useOutletContext();
  // "Accept…" in the application lists lands here with ?accept=1 to schedule the interview.
  const [searchParams, setSearchParams] = useSearchParams();
  const acceptRequested = useRef(searchParams.get("accept") === "1");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [invitationLetter, setInvitationLetter] = useState("");
  const [scheduling, setScheduling] = useState(false);
  
  const [ratings, setRatings] = useState({
    techSkills: 3,
    experience: 3,
    communication: 3,
    culturalFit: 3
  });

  const [checks, setChecks] = useState({
    hasDegree: false,
    passedTest: false,
    availableNow: false
  });

  const [notes, setNotes] = useState("");
  const [interviewType, setInterviewType] = useState("REMOTE");
  const [isAccepted, setIsAccepted] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  // Bumped by loadCandidateDetails() to load the data again (e.g. after an action on this page).
  const [reloadKey, setReloadKey] = useState(0);
  const loadCandidateDetails = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    // Ignore a response that arrives after a newer load started or the page closed.
    let ignore = false;
    (async () => {
      try {
        const data = await recruiterService.getApplicationById(id);
        if (!ignore) setApp(data);
        if (!ignore) setIsAccepted(data.status === "ACCEPTED");

        try {
          const saved = await recruiterService.getEvaluation(id);
          if (!ignore) setRatings({
            techSkills: saved.technicalSkills,
            experience: saved.experience,
            communication: saved.communication,
            culturalFit: saved.culturalFit
          });
          if (!ignore) setChecks({ hasDegree: saved.hasDegree, passedTest: saved.passedTest, availableNow: saved.availableNow });
          if (!ignore) setNotes(saved.notes || "");
          if (!ignore) setInterviewType(saved.interviewType || "REMOTE");
          if (!ignore) setSavedAt(saved.updatedAt);
        } catch (evalErr) {
          if (evalErr.response?.status !== 404) throw evalErr; // 404: not evaluated yet, keep defaults
        }
      } catch (err) {
        console.error(err);
        if (!ignore) setErrorMsg("Failed to load candidate application details.");
        if (!ignore) setShowAlert(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id, reloadKey]);


  // Same formula as the backend (ApplicationEvaluationService): stars scaled to 17, plus 1 point per check.
  const avgStars = (ratings.techSkills + ratings.experience + ratings.communication + ratings.culturalFit) / 4;
  const bonus = (checks.hasDegree ? 1 : 0) + (checks.passedTest ? 1 : 0) + (checks.availableNow ? 1 : 0);
  const finalScore = parseFloat(((avgStars / 5) * 17 + bonus).toFixed(1));

  const handleStarClick = (criteria, stars) => {
    setRatings({
      ...ratings,
      [criteria]: stars
    });
  };

  const handleSaveEvaluation = async () => {
    setSavingEvaluation(true);
    try {
      const saved = await recruiterService.saveEvaluation(id, {
        technicalSkills: ratings.techSkills,
        experience: ratings.experience,
        communication: ratings.communication,
        culturalFit: ratings.culturalFit,
        ...checks,
        notes,
        interviewType
      });
      setSavedAt(saved.updatedAt);
      toast("Your evaluation has been saved.");
    } catch (err) {
      const data = err.response?.data;
      setErrorMsg(data?.message || (data && typeof data === "object" ? Object.values(data)[0] : data) ||
        "Your evaluation couldn't be saved. Please try again.");
      setShowAlert(true);
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleStatusChange = async (status) => {
    if (status === "ACCEPTED") {
      handleAcceptClick();
      return;
    }

    if (!window.confirm("Are you sure you want to reject this candidate?")) {
      return;
    }

    try {
      await recruiterService.updateApplicationStatus(id, status);
      setIsAccepted(false);
      loadCandidateDetails();
      toast("Candidate has been rejected.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to update candidate status.");
      setShowAlert(true);
    }
  };

  const handleAcceptClick = () => {
    const candidateName = `${app.candidateName} ${app.candidateLastName}`;
    const jobTitle = app.jobOfferTitle;
    const companyName = user?.recruiterProfile?.companyName || "our company";
    const recruiterName = `${user?.firstName} ${user?.lastName}`;
    
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    defaultDate.setHours(10, 0, 0, 0);
    const dateString = defaultDate.getFullYear() + "-" + 
      String(defaultDate.getMonth()+1).padStart(2, '0') + "-" + 
      String(defaultDate.getDate()).padStart(2, '0') + "T" + 
      String(defaultDate.getHours()).padStart(2, '0') + ":" + 
      String(defaultDate.getMinutes()).padStart(2, '0');
    
    setInterviewDate(dateString);

    const formattedDate = formatDateTime(defaultDate);
    const initialText = 
      `Dear ${candidateName},\n\n` +
      `We are pleased to invite you for an interview regarding the ${jobTitle} position.\n\n` +
      `Details of the interview:\n` +
      `Date & Time: ${formattedDate}\n` +
      `Company: ${companyName}\n` +
      `Contact: ${recruiterName}\n\n` +
      `Best regards,\n` +
      `The Recruitment Team\n` +
      `${companyName}`;

    setInvitationLetter(initialText);
    setShowScheduleModal(true);
  };

  // One-shot: runs once when the application has loaded (the ref is cleared on first use).
  useEffect(() => {
    if (!acceptRequested.current || !app) return;
    acceptRequested.current = false;
    setSearchParams({}, { replace: true });
    if (app.status !== "ACCEPTED") handleAcceptClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on the loaded application only
  }, [app]);

  const handleDateChange = (newDateVal) => {
    setInterviewDate(newDateVal);
    if (!newDateVal) return;

    try {
      const parsedDate = new Date(newDateVal);
      const formattedDate = formatDateTime(parsedDate);
      const candidateName = `${app.candidateName} ${app.candidateLastName}`;
      const jobTitle = app.jobOfferTitle;
      const companyName = user?.recruiterProfile?.companyName || "our company";
      const recruiterName = `${user?.firstName} ${user?.lastName}`;

      const updatedText = 
        `Dear ${candidateName},\n\n` +
        `We are pleased to invite you for an interview regarding the ${jobTitle} position.\n\n` +
        `Details of the interview:\n` +
        `Date & Time: ${formattedDate}\n` +
        `Company: ${companyName}\n` +
        `Contact: ${recruiterName}\n\n` +
        `Best regards,\n` +
        `The Recruitment Team\n` +
        `${companyName}`;
      
      setInvitationLetter(updatedText);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!interviewDate) {
      setErrorMsg("Interview date and time are required.");
      setShowAlert(true);
      return;
    }

    setScheduling(true);
    try {
      await recruiterService.updateApplicationStatus(id, {
        status: "ACCEPTED",
        interviewDate: interviewDate,
        interviewLetter: invitationLetter
      });
      setIsAccepted(true);
      setShowScheduleModal(false);
      loadCandidateDetails();
      toast("Candidate accepted and interview invitation sent successfully.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to update status and schedule interview.");
      setShowAlert(true);
    } finally {
      setScheduling(false);
    }
  };

  // Describes the recruiter's own ratings; it is not an automatic recommendation.
  const getEvaluationStatus = () => {
    if (finalScore >= 16) return { text: "Your ratings: outstanding", accent: "green" };
    if (finalScore >= 12) return { text: "Your ratings: strong", accent: "cyan" };
    if (finalScore >= 8) return { text: "Your ratings: average", accent: "orange" };
    return { text: "Your ratings: weak", accent: "red" };
  };

  const evalStatus = getEvaluationStatus();
  const companyName = user?.recruiterProfile?.companyName || "";

  return (
    <div className="page-stack">
      <div className="row-between no-print">
        <button type="button" className="secondary-btn" onClick={() => navigate("/recruiter-dashboard/applications")}>
          Back to applications
        </button>
        {app && (
          <div className="row">
            <button type="button" className="action-btn-small btn-reject btn-large" onClick={() => handleStatusChange("REJECTED")}>
              Reject candidate
            </button>
            <button type="button" className="action-btn-small btn-approve btn-large" onClick={() => handleStatusChange("ACCEPTED")}>
              Accept candidate…
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonRows rows={6} />
      ) : !app ? (
        <div className="empty-state">Application not found.</div>
      ) : (
        <>
          <section className="dashboard-panel no-print">
            <h2>Your evaluation of {app.candidateName} {app.candidateLastName}</h2>
            <p className="text-muted text-sm">
              Your own assessment after reviewing the CV and interviewing the candidate. It is saved to your
              account and is separate from the automatic CV match score.
            </p>

            <div className="rating-section">
              {CRITERIA.map((c) => (
                <StarRating key={c.key} label={c.title} description={c.description}
                  value={ratings[c.key]} onChange={(stars) => handleStarClick(c.key, stars)} />
              ))}

              <fieldset className="plain-fieldset">
                <legend className="criteria-title">Checklist</legend>
                <div className="checklist-grid">
                  {CHECKS.map((c) => (
                    <label key={c.key} className="checkbox-row checkbox-row--boxed">
                      <input type="checkbox" className="checkbox-input" checked={checks[c.key]}
                        onChange={(e) => setChecks({ ...checks, [c.key]: e.target.checked })} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="form-group">
                <label htmlFor="evaluation-notes">Your notes</label>
                <textarea id="evaluation-notes" placeholder="Your remarks about the candidate and the interview..."
                  value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {isAccepted && (
                <div className="form-group">
                  <label htmlFor="interview-type">Interview format</label>
                  <select id="interview-type" className="select-narrow" value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}>
                    <option value="REMOTE">Remote (video call)</option>
                    <option value="ONSITE">Onsite (in person)</option>
                  </select>
                </div>
              )}

              <div className="rating-score-box">
                <div className="score-display">
                  <span className="eyebrow">Your evaluation score</span>
                  <span className="score-number">{finalScore} / 20</span>
                  <span className={`text-strong text-accent accent-${evalStatus.accent}`}>{evalStatus.text}</span>
                  <span className="hint">
                    {savedAt ? `Last saved ${formatDateTime(savedAt)}` : "Not saved yet"}
                  </span>
                </div>
                <div className="row">
                  <button type="button" className="secondary-btn" onClick={handleSaveEvaluation} disabled={savingEvaluation}>
                    {savingEvaluation ? "Saving…" : "Save evaluation"}
                  </button>
                  {isAccepted && (
                    <button type="button" className="primary-btn" onClick={handlePrintPDF}>
                      Print hiring letter (PDF)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {isAccepted && (
            <div className="print-document-container">
              <div className="doc-header">
                <div>
                  <div className="doc-title">Letter of Hire & Assignment</div>
                  {companyName && <div className="doc-company">{companyName}</div>}
                </div>
                <div className="doc-meta">
                  <div>Reference: HH-LETTER-{app.id}</div>
                  <div>Date: {formatDate(new Date())}</div>
                </div>
              </div>

              <div className="doc-recipient">
                <strong>To:</strong><br />
                {app.candidateName} {app.candidateLastName}<br />
                Application reference: {app.id}<br />
                Position: {app.jobOfferTitle}
              </div>

              <div className="doc-body">
                <p>Dear {app.candidateName} {app.candidateLastName},</p>
                <p>
                  Following the review of your application, we are pleased to inform you that you have succeeded in
                  the selection process for the {app.jobOfferTitle} position. Your evaluation score is <strong>{finalScore}/20</strong>.
                </p>
                <p>
                  We would like to invite you to a final <strong>{interviewType === "REMOTE" ? "remote interview" : "onsite interview"}</strong> to
                  agree on the contract terms and onboarding. We will contact you shortly to set a date.
                </p>
                {notes && (
                  <>
                    <p>Remarks from your assessment:</p>
                    <blockquote className="doc-quote">"{notes}"</blockquote>
                  </>
                )}
                <p>Sincerely,</p>
              </div>

              <div className="doc-footer">
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div>{companyName ? `${companyName} HR team` : "HR team"}</div>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div>Candidate acknowledgment</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <AlertModal
        isOpen={showAlert}
        type="error"
        title="Something went wrong"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />

      {showScheduleModal && app && (
        <div className="modal-overlay modal-overlay--top">
          <div className="modal-content modal-content--medium" role="dialog" aria-modal="true" aria-labelledby="schedule-title">
            <div className="modal-header">
              <h2 id="schedule-title">Schedule Interview & Send Invite</h2>
              <button type="button" className="close-btn" aria-label="Close" onClick={() => setShowScheduleModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="interview-date">Interview date and time *</label>
                <input id="interview-date" type="datetime-local" value={interviewDate}
                  onChange={(e) => handleDateChange(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="invitation-letter">Invitation letter (you can edit it)</label>
                <textarea id="invitation-letter" rows="10" className="letter-editor" value={invitationLetter}
                  onChange={(e) => setInvitationLetter(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setShowScheduleModal(false)} disabled={scheduling}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleConfirmSchedule} disabled={scheduling}>
                {scheduling ? "Sending invite…" : "Confirm & Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CRITERIA = [
  { key: "techSkills", title: "Technical skills", description: "Languages, frameworks and problem solving" },
  { key: "experience", title: "Professional experience", description: "Relevance of past roles and projects" },
  { key: "communication", title: "Communication", description: "Clarity, responsiveness, explaining problems" },
  { key: "culturalFit", title: "Team fit", description: "Fit with your team and ways of working" },
];

const CHECKS = [
  { key: "hasDegree", label: "Has the required degree" },
  { key: "passedTest", label: "Passed the technical test" },
  { key: "availableNow", label: "Available immediately" },
];

/** 1–5 stars as a radio group: arrow keys, Tab and screen readers work. */
function StarRating({ label, description, value, onChange }) {
  const name = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <fieldset className="rating-row plain-fieldset">
      <div className="rating-criteria">
        <legend className="criteria-title">{label}</legend>
        <span className="criteria-desc">{description}</span>
      </div>
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((stars) => (
          <label key={stars} className={`star-input ${stars <= value ? "active" : ""}`}>
            <input type="radio" className="visually-hidden" name={name} value={stars} checked={value === stars}
              onChange={() => onChange(stars)} />
            <span aria-hidden="true">★</span>
            <span className="visually-hidden">{stars} out of 5</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
