import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import fetchAllPages from "../utils/fetchAllPages";

export default function OfferApplications() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [busyAppId, setBusyAppId] = useState(null);
  const toast = useToast();

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
      const allApplications = await fetchAllPages(recruiterService.getApplications);
      const filtered = allApplications.filter(
        (app) => Number(app.jobOfferId) === Number(id)
      );
      setApplications(filtered);
    } catch (err) {
      console.error(err);
      setErrorMsg("The applicants for this offer couldn't be loaded. Please refresh the page.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  // Only rejecting happens inline; accepting needs an interview date (evaluation page).
  const handleStatusChange = async (appId, status) => {
    if (status === "REJECTED" && !window.confirm("Reject this application? The candidate will be notified.")) return;
    setBusyAppId(appId);
    try {
      await recruiterService.updateApplicationStatus(appId, status);
      toast("Application rejected.");
      fetchData(); // Refresh list
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <button className="secondary-btn" onClick={() => navigate("/recruiter-dashboard/offers")}>
          Back to job offers
        </button>
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : (
        <>
          <div style={{ marginBottom: "30px" }}>
            <h2 style={{ margin: "0 0 8px 0" }}>{offer?.title}</h2>
            <span className={`contract-badge badge-${(offer?.contractType || 'cdi').toLowerCase()}`} style={{ marginRight: "10px" }}>
              {offer?.contractType || "CDI"}
            </span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Location: {offer?.location} | Deadline: {new Date(offer?.deadline).toLocaleDateString("fr-FR")}
            </span>
          </div>

          {applications.length === 0 ? (
            <EmptyState
              title="No applicants yet"
              text="Nobody has applied to this offer so far."
            />
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
        </>
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
