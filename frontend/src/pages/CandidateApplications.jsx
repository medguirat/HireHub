import { useState, useEffect } from "react";
import candidateService from "../services/candidateService";
import AlertModal from "../components/AlertModal";

export default function CandidateApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // Success alert
  const [successMsg, setSuccessMsg] = useState("");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

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
      setErrorMsg("Failed to load your applications.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelApplication = async (id, title) => {
    if (!window.confirm(`Are you sure you want to cancel your application for "${title}"?`)) {
      return;
    }

    try {
      await candidateService.deleteApplication(id);
      setSuccessMsg(`Successfully cancelled application for "${title}".`);
      setShowSuccessAlert(true);
      fetchApplications();
      if (selectedApp?.id === id) {
        setSelectedApp(null);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to cancel application.");
      setShowAlert(true);
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
          <h2>My Applications</h2>
          <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Track and manage your submitted applications
          </div>
        </div>

        {loading && applications.length === 0 ? (
          <div className="loading-container" style={{ color: "#94a3b8", padding: "40px 0" }}>
            <div>Loading applications...</div>
          </div>
        ) : applications.length === 0 ? (
          <div className="empty-state" style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center" }}>
            You have not submitted any applications yet.
          </div>
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
                      </td>
                      <td>{app.recruiterCompany || "Company"}</td>
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
                              onClick={() => handleCancelApplication(app.id, app.jobOfferTitle)}
                            >
                              Cancel
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
        title="Application Status Error"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />

      <AlertModal 
        isOpen={showSuccessAlert}
        type="success"
        title="Application Cancelled"
        message={successMsg}
        onClose={() => setShowSuccessAlert(false)}
      />
    </div>
  );
}
