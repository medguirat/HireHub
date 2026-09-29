import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import candidateService from "../services/candidateService";
import AlertModal from "../components/AlertModal";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/Toast";

export default function CandidateApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Expanded application details (for showing interview letter)
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [page]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await candidateService.getApplications(page, 10);
      setApplications(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error(err);
      setErrorMsg("Your applications couldn't be loaded. Please refresh the page.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelApplication = async (id, title) => {
    if (!window.confirm(`Withdraw your application for "${title}"? This can't be undone.`)) {
      return;
    }

    setCancellingId(id);
    try {
      await candidateService.deleteApplication(id);
      toast(`Your application for "${title}" was withdrawn.`);
      fetchApplications();
      if (selectedApp?.id === id) {
        setSelectedApp(null);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Your application couldn't be withdrawn. Please try again.");
      setShowAlert(true);
    } finally {
      setCancellingId(null);
    }
  };

  const formatInterviewDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: selectedApp ? "1fr 1fr" : "1fr", gap: "24px", alignItems: "start" }}>
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2>Newest first</h2>
          <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Click an application to see its details.
          </div>
        </div>

        {loading && applications.length === 0 ? (
          <SkeletonRows rows={5} />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            text="Find an offer that suits you and apply in a couple of clicks."
            actionLabel="Browse job offers"
            onAction={() => navigate("/candidate-dashboard/offers")}
          />
        ) : (
          <>
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr 
                      key={app.id}
                      style={{ cursor: "pointer", backgroundColor: selectedApp?.id === app.id ? "rgba(59, 130, 246, 0.05)" : "transparent" }}
                      onClick={() => setSelectedApp(app)}
                    >
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {app.jobOfferTitle}
                        </span>
                        {app.offerClosed && (
                          <span className="status-chip status-chip--closed" style={{ marginLeft: 8 }}
                            title="The recruiter closed this offer; your application is kept">
                            Offer closed
                          </span>
                        )}
                      </td>
                      <td>{app.recruiterCompany || "—"}</td>
                      <td>
                        <span className={`status-badge status-${app.status.toLowerCase()}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="secondary-btn"
                            style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                            onClick={() => setSelectedApp(app)}
                          >
                            Details
                          </button>
                          {app.status === "PENDING" && (
                            <button 
                              className="action-btn-small btn-reject"
                              disabled={cancellingId === app.id}
                              onClick={() => handleCancelApplication(app.id, app.jobOfferTitle)}
                            >
                              {cancellingId === app.id ? "Withdrawing…" : "Withdraw"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-row" style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center" }}>
                <button 
                  disabled={page === 0}
                  className="secondary-btn" 
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", fontSize: "0.88rem" }}>
                  Page {page + 1} of {totalPages}
                </span>
                <button 
                  disabled={page >= totalPages - 1}
                  className="secondary-btn" 
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Expanded Details Side Panel (Interview Letter) */}
      {selectedApp && (
        <div className="dashboard-panel">
          <div className="panel-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "14px", marginBottom: "16px" }}>
            <h3>Application Details</h3>
            <button 
              className="close-btn" 
              style={{ fontSize: "1.2rem", padding: "0 4px" }}
              onClick={() => setSelectedApp(null)}
            >
              ×
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.9rem" }}>
            <div>
              <span style={{ color: "#94a3b8" }}>Job Offer:</span>
              <strong style={{ display: "block", color: "#fff", fontSize: "1.05rem", marginTop: "4px" }}>
                {selectedApp.jobOfferTitle}
              </strong>
              {selectedApp.offerClosed && (
                <span style={{ display: "block", color: "#94a3b8", fontSize: "0.82rem", marginTop: "4px" }}>
                  The recruiter has closed this offer. Your application is kept and its status may still change.
                </span>
              )}
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Company:</span>
              <strong style={{ display: "block", color: "#fff", marginTop: "4px" }}>
                {selectedApp.recruiterCompany}
              </strong>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>Status:</span>
              <div style={{ marginTop: "4px" }}>
                <span className={`status-badge status-${selectedApp.status.toLowerCase()}`}>
                  {selectedApp.status}
                </span>
              </div>
            </div>

            <div>
              <span style={{ color: "#94a3b8" }}>CV / Resume:</span>
              <div style={{ marginTop: "4px" }}>
                {selectedApp.cv ? (
                  <a href={selectedApp.cv} target="_blank" rel="noreferrer" className="cv-link" style={{ color: "#3b82f6", textDecoration: "underline" }}>
                    View Submitted CV (PDF)
                  </a>
                ) : (
                  "No CV file"
                )}
              </div>
            </div>

            {selectedApp.coverLetter && (
              <div>
                <span style={{ color: "#94a3b8" }}>Cover Letter:</span>
                <div style={{ marginTop: "4px" }}>
                  {selectedApp.coverLetter.startsWith("http") ? (
                    <a href={selectedApp.coverLetter} target="_blank" rel="noreferrer" className="cv-link" style={{ color: "#3b82f6", textDecoration: "underline" }}>
                      View Submitted Cover Letter (PDF)
                    </a>
                  ) : (
                    <p style={{ margin: 0, padding: "10px", backgroundColor: "rgba(0,0,0,0.15)", borderRadius: "6px", color: "#d1d5db", whiteSpace: "pre-wrap", border: "1px solid var(--border-color)", fontSize: "0.85rem" }}>
                      {selectedApp.coverLetter}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Scheduled Interview Details */}
            {selectedApp.status === "ACCEPTED" && selectedApp.interviewDate && (
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "10px" }}>
                <h4 style={{ color: "#60a5fa", margin: "0 0 10px 0" }}>Interview Details</h4>
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>Scheduled For:</span>
                  <strong style={{ display: "block", color: "#fff", fontSize: "0.95rem", marginTop: "2px" }}>
                    {formatInterviewDate(selectedApp.interviewDate)}
                  </strong>
                </div>

                {selectedApp.interviewLetter && (
                  <div>
                    <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>Invitation Letter:</span>
                    <pre 
                      style={{ 
                        marginTop: "6px",
                        padding: "12px", 
                        backgroundColor: "rgba(0,0,0,0.2)", 
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px", 
                        color: "#d1d5db", 
                        fontSize: "0.8rem", 
                        whiteSpace: "pre-wrap",
                        fontFamily: "inherit"
                      }}
                    >
                      {selectedApp.interviewLetter}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Something went wrong"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}
