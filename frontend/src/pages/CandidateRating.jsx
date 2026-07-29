import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";

export default function CandidateRating() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Rating states (1-5 stars)
  const [ratings, setRatings] = useState({
    techSkills: 3,
    experience: 3,
    communication: 3,
    culturalFit: 3
  });

  // Checkboxes
  const [checks, setChecks] = useState({
    hasDegree: false,
    passedTest: false,
    availableNow: false
  });

  const [notes, setNotes] = useState("");
  const [finalScore, setFinalScore] = useState(10);
  const [interviewType, setInterviewType] = useState("REMOTE");
  const [isAccepted, setIsAccepted] = useState(false);

  // Load candidate evaluation details
  useEffect(() => {
    loadCandidateDetails();
  }, [id]);

  const loadCandidateDetails = async () => {
    setLoading(true);
    try {
      const data = await recruiterService.getApplicationById(id);
      setApp(data);
      setIsAccepted(data.status === "ACCEPTED");

      // Load saved evaluation from localStorage if it exists
      const savedEval = localStorage.getItem(`evaluation_app_${id}`);
      if (savedEval) {
        const parsed = JSON.parse(savedEval);
        setRatings(parsed.ratings || { techSkills: 3, experience: 3, communication: 3, culturalFit: 3 });
        setChecks(parsed.checks || { hasDegree: false, passedTest: false, availableNow: false });
        setNotes(parsed.notes || "");
        setInterviewType(parsed.interviewType || "REMOTE");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load candidate application details.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  // Calculate score whenever inputs change
  useEffect(() => {
    // Stars average out of 5
    const avgStars = (ratings.techSkills + ratings.experience + ratings.communication + ratings.culturalFit) / 4;
    // Checkbox bonus: +1 point each
    const bonus = (checks.hasDegree ? 1 : 0) + (checks.passedTest ? 1 : 0) + (checks.availableNow ? 1 : 0);
    
    // Scale stars to 17 and add 3 bonus points to make 20 max
    const calculated = (avgStars / 5) * 17 + bonus;
    setFinalScore(parseFloat(calculated.toFixed(1)));
  }, [ratings, checks]);

  const handleStarClick = (criteria, stars) => {
    setRatings({
      ...ratings,
      [criteria]: stars
    });
  };

  const handleSaveEvaluation = () => {
    const evaluation = {
      ratings,
      checks,
      notes,
      finalScore,
      interviewType
    };
    localStorage.setItem(`evaluation_app_${id}`, JSON.stringify(evaluation));
    setShowSuccess(true);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleStatusChange = async (status) => {
    try {
      await recruiterService.updateApplicationStatus(id, status);
      setIsAccepted(status === "ACCEPTED");
      loadCandidateDetails();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to update candidate status.");
      setShowAlert(true);
    }
  };

  const getEvaluationStatus = () => {
    if (finalScore >= 16) return { text: "Outstanding Candidate - Highly Recommended", color: "#10b981" };
    if (finalScore >= 12) return { text: "Strong Candidate - Recommended for Interview", color: "#3b82f6" };
    if (finalScore >= 8) return { text: "Average Candidate - Review Pending", color: "#f59e0b" };
    return { text: "Weak Candidate - Rejection Advised", color: "#ef4444" };
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
            <h2>Candidate Screening: {app.candidateName} {app.candidateLastName}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Evaluate the candidate based on resume details, skills, and screening calls to calculate their suitability.
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
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Overall Suitability</span>
                  <span className="score-number">{finalScore} / 20</span>
                  <span style={{ color: evalStatus.color, fontWeight: 700, fontSize: "0.95rem" }}>
                    {evalStatus.text}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button className="secondary-btn" onClick={handleSaveEvaluation}>
                    Save Rating
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

      <AlertModal 
        isOpen={showSuccess}
        type="success"
        title="Success"
        message="Evaluation scores and notes saved successfully!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
