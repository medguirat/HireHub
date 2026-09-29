import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";
import { useToast } from "../components/Toast";

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
  const [finalScore, setFinalScore] = useState(10);
  const [interviewType, setInterviewType] = useState("REMOTE");
  const [isAccepted, setIsAccepted] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  useEffect(() => {
    loadCandidateDetails();
  }, [id]);

  const loadCandidateDetails = async () => {
    setLoading(true);
    try {
      const data = await recruiterService.getApplicationById(id);
      setApp(data);
      setIsAccepted(data.status === "ACCEPTED");

      try {
        const saved = await recruiterService.getEvaluation(id);
        setRatings({
          techSkills: saved.technicalSkills,
          experience: saved.experience,
          communication: saved.communication,
          culturalFit: saved.culturalFit
        });
        setChecks({ hasDegree: saved.hasDegree, passedTest: saved.passedTest, availableNow: saved.availableNow });
        setNotes(saved.notes || "");
        setInterviewType(saved.interviewType || "REMOTE");
        setSavedAt(saved.updatedAt);
      } catch (evalErr) {
        if (evalErr.response?.status !== 404) throw evalErr; // 404: not evaluated yet, keep defaults
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load candidate application details.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const avgStars = (ratings.techSkills + ratings.experience + ratings.communication + ratings.culturalFit) / 4;
    const bonus = (checks.hasDegree ? 1 : 0) + (checks.passedTest ? 1 : 0) + (checks.availableNow ? 1 : 0);
    
    const calculated = (avgStars / 5) * 17 + bonus;
    setFinalScore(parseFloat(calculated.toFixed(1)));
  }, [ratings, checks]);

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
      setFinalScore(saved.score);
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

    const formattedDate = defaultDate.toLocaleString();
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

  useEffect(() => {
    if (!acceptRequested.current || !app) return;
    acceptRequested.current = false;
    setSearchParams({}, { replace: true });
    if (app.status !== "ACCEPTED") handleAcceptClick();
  }, [app]);

  const handleDateChange = (newDateVal) => {
    setInterviewDate(newDateVal);
    if (!newDateVal) return;

    try {
      const parsedDate = new Date(newDateVal);
      const formattedDate = parsedDate.toLocaleString();
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
    if (finalScore >= 16) return { text: "Your ratings: outstanding", color: "#10b981" };
    if (finalScore >= 12) return { text: "Your ratings: strong", color: "#3b82f6" };
    if (finalScore >= 8) return { text: "Your ratings: average", color: "#f59e0b" };
    return { text: "Your ratings: weak", color: "#ef4444" };
  };

  const evalStatus = getEvaluationStatus();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }} className="no-print">
        <button className="secondary-btn" onClick={() => navigate("/recruiter-dashboard/applications")}>
          Back to Applications
        </button>
        {app && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              className="action-btn-small btn-reject"
              style={{ padding: "10px 20px" }}
              onClick={() => handleStatusChange("REJECTED")}
            >
              Reject Candidate
            </button>
            <button 
              className="action-btn-small btn-approve"
              style={{ padding: "10px 20px" }}
              onClick={() => handleStatusChange("ACCEPTED")}
            >
              Accept Candidate
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div>Loading candidate evaluation...</div>
        </div>
      ) : !app ? (
        <div className="empty-state">Application not found.</div>
      ) : (
        <>
          {/* Rating workspace panel */}
          <div className="dashboard-panel no-print">
            <h2>Your evaluation of {app.candidateName} {app.candidateLastName}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Your own assessment after reviewing the CV and interviewing the candidate. It is saved to your
              account and is separate from the automatic CV match score.
            </p>

            <div className="rating-section">
              {/* Technical skills */}
              <div className="rating-row">
                <div className="rating-criteria">
                  <span className="criteria-title">Technical Competence</span>
                  <span className="criteria-desc">Core languages, algorithms, framework capabilities</span>
                </div>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span 
                      key={s} 
                      className={`star-input ${s <= ratings.techSkills ? "active" : ""}`}
                      onClick={() => handleStarClick("techSkills", s)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="rating-row">
                <div className="rating-criteria">
                  <span className="criteria-title">Professional Experience</span>
                  <span className="criteria-desc">Relevance of former companies, projects, and work timeline</span>
                </div>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span 
                      key={s} 
                      className={`star-input ${s <= ratings.experience ? "active" : ""}`}
                      onClick={() => handleStarClick("experience", s)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* Communication */}
              <div className="rating-row">
                <div className="rating-criteria">
                  <span className="criteria-title">Communication & Soft Skills</span>
                  <span className="criteria-desc">Clarity of speech, responsiveness, problem explanation</span>
                </div>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span 
                      key={s} 
                      className={`star-input ${s <= ratings.communication ? "active" : ""}`}
                      onClick={() => handleStarClick("communication", s)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* Cultural fit */}
              <div className="rating-row">
                <div className="rating-criteria">
                  <span className="criteria-title">Company Cultural Fit</span>
                  <span className="criteria-desc">Alignment with core corporate values and team synergy</span>
                </div>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span 
                      key={s} 
                      className={`star-input ${s <= ratings.culturalFit ? "active" : ""}`}
                      onClick={() => handleStarClick("culturalFit", s)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* Checkbox validations */}
              <div style={{ marginTop: "16px" }}>
                <h4 style={{ margin: "0 0 12px 0" }}>Checklist Qualifications</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  <label className="checkbox-row" style={{ backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                    <input 
                      type="checkbox" 
                      className="checkbox-input"
                      checked={checks.hasDegree}
                      onChange={(e) => setChecks({ ...checks, hasDegree: e.target.checked })}
                    />
                    <span>Has Required Degree</span>
                  </label>

                  <label className="checkbox-row" style={{ backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                    <input 
                      type="checkbox" 
                      className="checkbox-input"
                      checked={checks.passedTest}
                      onChange={(e) => setChecks({ ...checks, passedTest: e.target.checked })}
                    />
                    <span>Passed Tech Assessment</span>
                  </label>

                  <label className="checkbox-row" style={{ backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                    <input 
                      type="checkbox" 
                      className="checkbox-input"
                      checked={checks.availableNow}
                      onChange={(e) => setChecks({ ...checks, availableNow: e.target.checked })}
                    />
                    <span>Available Immediately</span>
                  </label>
                </div>
              </div>

              {/* Text notes */}
              <div className="form-group" style={{ marginTop: "16px" }}>
                <label>Recruiter Assessment Notes</label>
                <textarea 
                  placeholder="Enter custom remarks regarding the candidate interview..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Interview Settings */}
              {isAccepted && (
                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label>Scheduled Interview Modality</label>
                  <select 
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    style={{ width: "min(300px, 100%)" }}
                  >
                    <option value="REMOTE">Remote (Google Meet / Zoom)</option>
                    <option value="ONSITE">Onsite (Face-to-Face Meeting)</option>
                  </select>
                </div>
              )}

              {/* Results & Saving */}
              <div className="rating-score-box">
                <div className="score-display">
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Your evaluation score</span>
                  <span className="score-number">{finalScore} / 20</span>
                  <span style={{ color: evalStatus.color, fontWeight: 700, fontSize: "0.95rem" }}>
                    {evalStatus.text}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {savedAt ? `Last saved ${new Date(savedAt).toLocaleString()}` : "Not saved yet"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button className="secondary-btn" onClick={handleSaveEvaluation} disabled={savingEvaluation}>
                    {savingEvaluation ? "Saving…" : "Save evaluation"}
                  </button>
                  {isAccepted && (
                    <button className="primary-btn" onClick={handlePrintPDF}>
                      Print Hiring Letter (PDF)
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* PRINT DOCUMENT SECTION (Letter of Hire) */}
          {isAccepted && (
            <div className="print-document-container">
              <div className="doc-header">
                <div>
                  <div className="doc-title">Letter of Hire & Assignment</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>HireHub Recruitment Corp.</div>
                </div>
                <div className="doc-meta">
                  <div>Document ID: HH-LETTER-{app.id}</div>
                  <div>Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                </div>
              </div>

              <div className="doc-recipient">
                <strong>To:</strong><br />
                {app.candidateName} {app.candidateLastName}<br />
                Candidate Application reference: ID {app.id}<br />
                Position applied: {app.jobOfferTitle}
              </div>

              <div className="doc-body">
                <p>Dear {app.candidateName} {app.candidateLastName},</p>
                
                <p>
                  Following the review of your application credentials and technical evaluations, we are pleased to inform you that you have succeeded in the selection process. Your application score reached <strong>{finalScore}/20</strong>, classifying you as one of our top prospects.
                </p>

                <p>
                  We are delighted to invite you for a final <strong>{interviewType === "REMOTE" ? "Remote Google Meet Interview" : "Onsite Face-to-Face Interview"}</strong> with our engineering leadership to align on contract terms and onboarding logistics. Our hiring team will contact you shortly to coordinate calendar details.
                </p>

                <p>
                  Please find below the remarks compiled during your assessment process:
                </p>
                
                <blockquote style={{ borderLeft: "3px solid #cbd5e1", paddingLeft: "16px", fontStyle: "italic", margin: "20px 0" }}>
                  "{notes || "Excellent profile matching technical and soft skills parameters required for this position."}"
                </blockquote>

                <p>
                  We look forward to collaborating with you and building an outstanding future together at our corporation.
                </p>

                <p>Sincerely,</p>
              </div>

              <div className="doc-footer">
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div>Corporate HR Team</div>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div>Candidate Acknowledgment</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Operation Failed"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />


      {/* Schedule Interview Modal */}
      {showScheduleModal && app && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content" style={{ color: "var(--text-primary)", maxWidth: "600px" }}>
            <div className="modal-header">
              <h2>Schedule Interview & Send Invite</h2>
              <button className="close-btn" onClick={() => setShowScheduleModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Interview Date & Time *</label>
                <input 
                  type="datetime-local" 
                  value={interviewDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                  style={{ color: "#fff" }}
                />
              </div>

              <div className="form-group" style={{ marginTop: "16px" }}>
                <label>Invitation Letter Preview (Editable)</label>
                <textarea 
                  rows="10" 
                  value={invitationLetter}
                  onChange={(e) => setInvitationLetter(e.target.value)}
                  style={{ 
                    fontFamily: "inherit", 
                    fontSize: "0.85rem", 
                    lineHeight: "1.5", 
                    backgroundColor: "rgba(0,0,0,0.2)", 
                    color: "#fff",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px",
                    resize: "vertical"
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowScheduleModal(false)} disabled={scheduling}>
                Cancel
              </button>
              <button className="primary-btn" onClick={handleConfirmSchedule} disabled={scheduling}>
                {scheduling ? "Sending Invite..." : "Confirm & Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
