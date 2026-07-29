import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";

export default function RecruiterApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await recruiterService.getApplications(0, 100);
      setApplications(data.content || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load candidate applications.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await recruiterService.updateApplicationStatus(id, status);
      loadApplications();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to update candidate status.");
      setShowAlert(true);
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h2>Candidate Applications ({applications.length})</h2>
      </div>

      {loading ? (
        <div className="loading-container">
          <div>Loading applications...</div>
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-state">No candidates have applied to your offers yet.</div>
      ) : (
        <div className="custom-table-container">
          <table className="custom-table">
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
                  <td>
                    <span 
                      className="candidate-name-link"
                      onClick={() => navigate(`/recruiter-dashboard/applications/${app.id}/rate`)}
                    >
                      {app.candidateName} {app.candidateLastName}
                    </span>
                  </td>
                  <td>{app.jobOfferTitle}</td>
                  <td>
                    {app.cv ? (
                      <a href={app.cv} target="_blank" rel="noreferrer" className="cv-link">
                        Open CV
                      </a>
                    ) : (
                      "No CV"
                    )}
                  </td>
                  <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={app.coverLetter}>
                    {app.coverLetter || "No cover letter"}
                  </td>
                  <td>
                    <span className={`status-badge status-${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-row">
                      <button 
                        className="action-btn-small btn-approve"
                        onClick={() => handleStatusChange(app.id, "ACCEPTED")}
                      >
                        Accept
                      </button>
                      <button 
                        className="action-btn-small btn-reject"
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
        title="Operation Failed"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}
