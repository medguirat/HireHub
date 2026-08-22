import { useEffect, useState } from "react";
import candidateService from "../services/candidateService";

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await candidateService.getMyApplications();
      setApplications(res.data.content);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusClass = (status) => {
    if (status === "ACCEPTED") return "status-accepted";
    if (status === "REJECTED") return "status-rejected";
    return "status-pending";
  };

  const handleWithdraw = async (id) => {
    if (!window.confirm("Withdraw this application?")) return;
    try {
      await candidateService.deleteApplication(id);
      fetchApplications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h2>My Applications</h2>
      </div>

      {loading ? (
        <div className="loading-container">Loading your applications...</div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          You haven't applied to any job offers yet. Head to Browse Offers to get started.
        </div>
      ) : (
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>CV</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>{app.jobOfferTitle}</td>
                  <td>
                    {app.cv ? (
                      <a href={app.cv} target="_blank" rel="noreferrer" className="cv-link">
                        View CV
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${statusClass(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    {app.status === "PENDING" && (
                      <button className="btn-delete action-btn-small" onClick={() => handleWithdraw(app.id)}>
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}