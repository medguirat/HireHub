import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";

export default function RecruiterOverview() {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const offersData = await recruiterService.getOffers(0, 50);
      const appsData = await recruiterService.getApplications(0, 100);
      setOffers(offersData.content || []);
      setApplications(appsData.content || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load dashboard statistics.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await recruiterService.updateApplicationStatus(id, status);
      fetchData(); // Refresh
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to update candidate status.");
      setShowAlert(true);
    }
  };

  const totalOffers = offers.length;
  const totalApplications = applications.length;
  const pendingApps = applications.filter((app) => app.status === "PENDING").length;
  const acceptedApps = applications.filter((app) => app.status === "ACCEPTED").length;

  return (
    <div>
      {loading ? (
        <div className="loading-container">
          <div>Loading overview stats...</div>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-title">Total Job Offers</div>
              <div className="stat-value">{totalOffers}</div>
            </div>
            <div className="stat-card orange">
              <div className="stat-title">Applications Received</div>
              <div className="stat-value">{totalApplications}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-title">Pending Review</div>
              <div className="stat-value">{pendingApps}</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-title">Accepted Candidates</div>
              <div className="stat-value">{acceptedApps}</div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <h2>Recent Applications</h2>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="primary-btn" onClick={() => navigate("/recruiter-dashboard/create-offer")}>
                  Create Job Offer
                </button>
                <button className="secondary-btn" onClick={() => navigate("/recruiter-dashboard/applications")}>
                  View All
                </button>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="empty-state">No applications received yet.</div>
            ) : (
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Applied Position</th>
                      <th>CV / Resume</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.slice(0, 5).map((app) => (
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
                              View CV
                            </a>
                          ) : (
                            "No CV"
                          )}
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
          </div>
        </>
      )}

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Action Error"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}
