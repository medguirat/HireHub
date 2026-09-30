import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/toastContext";
import fetchAllPages from "../utils/fetchAllPages";
import { errorMessage } from "../utils/apiError";
import DocumentButton from "../components/DocumentButton";

export default function RecruiterOverview() {
  const navigate = useNavigate();
  useOutletContext();
  const toast = useToast();
  const [busyAppId, setBusyAppId] = useState(null);
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // Bumped by fetchData() to load the data again (e.g. after an action on this page).
  const [reloadKey, setReloadKey] = useState(0);
  const fetchData = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    // Ignore a response that arrives after a newer load started or the page closed.
    let ignore = false;
    (async () => {
      try {
        const [allOffers, allApplications] = await Promise.all([
          fetchAllPages(recruiterService.getOffers),
          fetchAllPages(recruiterService.getApplications)
        ]);
        if (!ignore) setOffers(allOffers);
        if (!ignore) setApplications(allApplications);
      } catch (err) {
        console.error(err);
        if (!ignore) setErrorMsg("Your overview couldn't be loaded. Please refresh the page.");
        if (!ignore) setShowAlert(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [reloadKey]);


  // Only rejecting happens inline; accepting needs an interview date (evaluation page).
  const handleStatusChange = async (id, status) => {
    if (status === "REJECTED" && !window.confirm("Reject this application? The candidate will be notified.")) return;
    setBusyAppId(id);
    try {
      await recruiterService.updateApplicationStatus(id, status);
      toast("Application rejected.");
      fetchData(); // Refresh
    } catch (err) {
      console.error(err);
      setErrorMsg(errorMessage(err, "The candidate's status couldn't be updated. Please try again."));
      setShowAlert(true);
    } finally {
      setBusyAppId(null);
    }
  };

  const openOffers = offers.filter((offer) => offer.status !== "CLOSED").length;
  const totalApplications = applications.length;
  const pendingApps = applications.filter((app) => app.status === "PENDING").length;
  const acceptedApps = applications.filter((app) => app.status === "ACCEPTED").length;

  return (
    <div>
      {loading ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-title">Open job offers</div>
              <div className="stat-value">{openOffers}</div>
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
              <div className="row">
                <button className="secondary-btn" onClick={() => navigate("/recruiter-dashboard/applications")}>
                  All applications
                </button>
              </div>
            </div>

            {applications.length === 0 ? (
              offers.length === 0 ? (
                <EmptyState
                  title="No job offers yet"
                  text="Publish an offer to start receiving applications."
                  actionLabel="Create your first offer"
                  onAction={() => navigate("/recruiter-dashboard/create-offer")}
                />
              ) : (
                <EmptyState
                  title="No applications yet"
                  text="Applications to your offers will show up here."
                  actionLabel="View my offers"
                  onAction={() => navigate("/recruiter-dashboard/offers")}
                />
              )
            ) : (
              <div className="custom-table-container">
                <table className="custom-table responsive-table">
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
                        <td data-label="Candidate Name">
                          <button type="button" className="candidate-name-link link-reset" onClick={() => navigate(`/recruiter-dashboard/applications/${app.id}/rate`)}>
                            {app.candidateName} {app.candidateLastName}
                          </button>
                        </td>
                        <td data-label="Applied Position">{app.jobOfferTitle}</td>
                        <td data-label="CV / Resume">
                          {app.cvFileName ? (
                            <DocumentButton applicationId={app.id} fileName={app.cvFileName} label="View CV"
                              title={`CV of ${app.candidateName} ${app.candidateLastName}`} />
                          ) : (
                            "No CV"
                          )}
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
          </div>
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
