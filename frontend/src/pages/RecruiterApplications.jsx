import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import fetchAllPages from "../utils/fetchAllPages";

export default function RecruiterApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [busyAppId, setBusyAppId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      setApplications(await fetchAllPages(recruiterService.getApplications));
    } catch (err) {
      console.error(err);
      setErrorMsg("Applications couldn't be loaded. Please refresh the page.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  // Only rejecting happens inline; accepting needs an interview date (evaluation page).
  const handleStatusChange = async (id, status) => {
    if (status === "REJECTED" && !window.confirm("Reject this application? The candidate will be notified.")) return;
    setBusyAppId(id);
    try {
      await recruiterService.updateApplicationStatus(id, status);
      toast("Application rejected.");
      loadApplications();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to update candidate status.");
      setShowAlert(true);
    } finally {
      setBusyAppId(null);
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h2>{loading ? "Loading…" : `${applications.length} application${applications.length === 1 ? "" : "s"}, newest first`}</h2>
      </div>

      {loading ? (
        <SkeletonRows rows={6} />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          text="When candidates apply to your offers, they'll appear here."
          actionLabel="View my offers"
          onAction={() => navigate("/recruiter-dashboard/offers")}
        />
      ) : (
        <div className="custom-table-container">
          <table className="custom-table responsive-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job Position</th>
                <th>CV / Resume</th>
                <th>Cover Letter</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td data-label="Candidate">
                    <button type="button" className="candidate-name-link link-reset" onClick={() => navigate(`/recruiter-dashboard/applications/${app.id}/rate`)}>
                      {app.candidateName} {app.candidateLastName}
                    </button>
                  </td>
                  <td data-label="Job Position">{app.jobOfferTitle}</td>
                  <td data-label="CV / Resume">
                    {app.cv ? (
                      <a href={app.cv} target="_blank" rel="noreferrer" className="cv-link">
                        Open CV
                      </a>
                    ) : (
                      "No CV"
                    )}
                  </td>
                  <td data-label="Cover Letter" className="cell-truncate" title={app.coverLetter}>
                    {app.coverLetter || "No cover letter"}
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge status-${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="action-row">
                      <button 
                        className="action-btn-small btn-approve"
                        disabled={busyAppId === app.id || app.status === "ACCEPTED"}
                        onClick={() => navigate(`/recruiter-dashboard/applications/${app.id}/rate?accept=1`)}
                        title="Accepting needs an interview date: opens the scheduling dialog"
                      >
                        Accept…
                      </button>
                      <button 
                        className="action-btn-small btn-reject"
                        disabled={busyAppId === app.id || app.status === "REJECTED"}
                        onClick={() => handleStatusChange(app.id, "REJECTED")}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
