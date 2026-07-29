import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";

export default function OfferApplications() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch offer info
      const offerData = await recruiterService.getOfferById(id);
      setOffer(offerData);

      // 2. Fetch applications and filter by jobOfferId
      const appsData = await recruiterService.getApplications(0, 200);
      const filtered = (appsData.content || []).filter(
        (app) => Number(app.jobOfferId) === Number(id)
      );
      setApplications(filtered);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load applications for this job offer.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId, status) => {
    try {
      await recruiterService.updateApplicationStatus(appId, status);
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to update candidate status.");
      setShowAlert(true);
    }
  };

  return (
    <div className="dashboard-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <button className="secondary-btn" onClick={() => navigate("/recruiter-dashboard/offers")}>
          Back to Offers
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div>Loading applications list...</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "30px" }}>
            <h2 style={{ margin: "0 0 8px 0" }}>Applications for "{offer?.title}"</h2>
            <span className={`contract-badge badge-${(offer?.contractType || 'cdi').toLowerCase()}`} style={{ marginRight: "10px" }}>
              {offer?.contractType || "CDI"}
            </span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              📍 {offer?.location} | ⏰ Deadline: {new Date(offer?.deadline).toLocaleDateString("fr-FR")}
            </span>
          </div>

          {applications.length === 0 ? (
            <div className="empty-state">No candidates have applied to this job offer yet.</div>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
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
        </>
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
