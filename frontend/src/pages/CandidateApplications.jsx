import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import candidateService from "../services/candidateService";
import AlertModal from "../components/AlertModal";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/toastContext";
import { formatDateTime } from "../utils/format";
import { errorMessage } from "../utils/apiError";
import DocumentButton from "../components/DocumentButton";

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

  // Bumped by fetchApplications() to load the data again (e.g. after an action on this page).
  const [reloadKey, setReloadKey] = useState(0);
  const fetchApplications = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    // Ignore a response that arrives after a newer load started or the page closed.
    let ignore = false;
    (async () => {
      try {
        const data = await candidateService.getApplications(page, 10);
        if (!ignore) setApplications(data.content || []);
        if (!ignore) setTotalPages(data.totalPages || 0);
      } catch (err) {
        console.error(err);
        if (!ignore) setErrorMsg("Your applications couldn't be loaded. Please refresh the page.");
        if (!ignore) setShowAlert(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [page, reloadKey]);


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
      setErrorMsg(errorMessage(err, "Your application couldn't be withdrawn. Please try again."));
      setShowAlert(true);
    } finally {
      setCancellingId(null);
    }
  };

  const formatInterviewDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return formatDateTime(date);
    } catch (e) {
      return dateStr;
    }
  };

  const statusLabel = (status) => status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <div className={`split-view ${selectedApp ? "split-view--open" : ""}`}>
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2>Newest first</h2>
          <span className="text-muted text-sm">Select an application to see its details.</span>
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
              <table className="custom-table responsive-table">
                <thead>
                  <tr>
                    <th>Job title</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className={`row-selectable ${selectedApp?.id === app.id ? "is-selected" : ""}`}
                      onClick={() => setSelectedApp(app)}>
                      <td data-label="Job title">
                        <span className="text-strong">{app.jobOfferTitle}</span>
                        {app.offerClosed && (
                          <span className="status-chip status-chip--closed chip-inline"
                            title="The recruiter closed this offer; your application is kept">
                            Offer closed
                          </span>
                        )}
                      </td>
                      <td data-label="Company">{app.recruiterCompany || "—"}</td>
                      <td data-label="Status">
                        <span className={`status-badge status-${app.status.toLowerCase()}`}>{statusLabel(app.status)}</span>
                      </td>
                      <td data-label="Actions">
                        <div className="row" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="secondary-btn btn-compact" onClick={() => setSelectedApp(app)}
                            aria-label={`Details of your application for ${app.jobOfferTitle}`}>
                            Details
                          </button>
                          {app.status === "PENDING" && (
                            <button type="button" className="action-btn-small btn-reject" disabled={cancellingId === app.id}
                              onClick={() => handleCancelApplication(app.id, app.jobOfferTitle)}>
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
            <Pagination page={page} totalPages={totalPages} onChange={(next) => { setLoading(true); setPage(next); }} />
          </>
        )}
      </div>

      {selectedApp && (
        <aside className="dashboard-panel" aria-labelledby="application-details-title">
          <div className="panel-header panel-header--divided">
            <h3 id="application-details-title">Application details</h3>
            <button type="button" className="close-btn" aria-label="Close details" onClick={() => setSelectedApp(null)}>×</button>
          </div>

          <dl className="detail-list">
            <div>
              <dt>Job offer</dt>
              <dd>{selectedApp.jobOfferTitle}</dd>
              {selectedApp.offerClosed && (
                <p className="hint">The recruiter has closed this offer. Your application is kept and its status may still change.</p>
              )}
            </div>
            <div>
              <dt>Company</dt>
              <dd>{selectedApp.recruiterCompany || "—"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd><span className={`status-badge status-${selectedApp.status.toLowerCase()}`}>{statusLabel(selectedApp.status)}</span></dd>
            </div>
            <div>
              <dt>CV</dt>
              <dd>
                {selectedApp.cvFileName ? (
                  <DocumentButton applicationId={selectedApp.id} fileName={selectedApp.cvFileName}
                    label="Open the CV you sent (PDF)" title="The CV you sent" />
                ) : "No CV file"}
              </dd>
            </div>
            {(selectedApp.coverLetter || selectedApp.coverLetterFileName) && (
              <div>
                <dt>Cover letter</dt>
                <dd>
                  {selectedApp.coverLetterFileName ? (
                    <DocumentButton applicationId={selectedApp.id} which="cover-letter" fileName={selectedApp.coverLetterFileName}
                      label="Open your cover letter (PDF)" title="Your cover letter" />
                  ) : (
                    <p className="letter-block">{selectedApp.coverLetter}</p>
                  )}
                </dd>
              </div>
            )}
          </dl>

          {selectedApp.status === "ACCEPTED" && selectedApp.interviewDate && (
            <section className="divided-section">
              <h4 className="info-card__title">Interview</h4>
              <dl className="detail-list">
                <div>
                  <dt>Scheduled for</dt>
                  <dd>{formatInterviewDate(selectedApp.interviewDate)}</dd>
                </div>
                {selectedApp.interviewLetter && (
                  <div>
                    <dt>Invitation letter</dt>
                    <dd><pre className="letter-block">{selectedApp.interviewLetter}</pre></dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </aside>
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
