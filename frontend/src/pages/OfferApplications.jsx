import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/toastContext";
import fetchAllPages from "../utils/fetchAllPages";
import { formatDate } from "../utils/format";
import { errorMessage } from "../utils/apiError";

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

  // Bumped by fetchData() to load the data again (e.g. after an action on this page).
  const [reloadKey, setReloadKey] = useState(0);
  const fetchData = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    // Ignore a response that arrives after a newer load started or the page closed.
    let ignore = false;
    (async () => {
      try {
        // 1. Fetch offer info
        const offerData = await recruiterService.getOfferById(id);
        if (!ignore) setOffer(offerData);

        // 2. Fetch applications and filter by jobOfferId
        const allApplications = await fetchAllPages(recruiterService.getApplications);
        const filtered = allApplications.filter(
          (app) => Number(app.jobOfferId) === Number(id)
        );
        if (!ignore) setApplications(filtered);
      } catch (err) {
        console.error(err);
        if (!ignore) setErrorMsg("The applicants for this offer couldn't be loaded. Please refresh the page.");
        if (!ignore) setShowAlert(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id, reloadKey]);


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
      setErrorMsg(errorMessage(err, "The candidate's status couldn't be updated. Please try again."));
      setShowAlert(true);
    } finally {
      setBusyAppId(null);
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="row-between panel-header--spaced">
        <button className="secondary-btn" onClick={() => navigate("/recruiter-dashboard/offers")}>
          Back to job offers
        </button>
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : (
        <>
          <div className="stack panel-header--spaced">
            <h2 className="page-heading">{offer?.title}</h2>
            <div className="row">
              <span className={`contract-badge badge-${(offer?.contractType || 'cdi').toLowerCase()}`}>
                {offer?.contractType || "CDI"}
              </span>
              <span className="text-muted text-sm">
                Location: {offer?.location} · Deadline: {formatDate(offer?.deadline, "none")}
              </span>
            </div>
          </div>

          {applications.length === 0 ? (
            <EmptyState
              title="No applicants yet"
              text="Nobody has applied to this offer so far."
            />
          ) : (
            <div className="custom-table-container">
              <table className="custom-table responsive-table">
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
                      <td data-label="Candidate">
                        <button type="button" className="candidate-name-link link-reset" onClick={() => navigate(`/recruiter-dashboard/applications/${app.id}/rate`)}>
                          {app.candidateName} {app.candidateLastName}
                        </button>
                      </td>
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
