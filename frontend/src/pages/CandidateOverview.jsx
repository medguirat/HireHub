import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import candidateService from "../services/candidateService";
import Avatar from "../components/Avatar";
import ApplyModal from "../components/ApplyModal";
import CvMatchModal from "../components/CvMatchModal";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/toastContext";

export default function CandidateOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0
  });
  const [recentOffers, setRecentOffers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const toast = useToast();

  // Notification Modal State
  const [activeNotification, setActiveNotification] = useState(null);

  // Bumped by fetchData() to load the data again (e.g. after an action on this page).
  const [reloadKey, setReloadKey] = useState(0);
  const fetchData = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    // Ignore a response that arrives after a newer load started or the page closed.
    let ignore = false;
    (async () => {

      // 1. Fetch dashboard stats
      try {
        const statsData = await candidateService.getDashboard();
        if (statsData) setStats(statsData);
      } catch (err) {
        console.warn("Could not load candidate dashboard stats:", err);
        // Default fallback stats if backend endpoint is initializing
        if (!ignore) setStats({
          totalApplications: 0,
          pendingApplications: 0,
          acceptedApplications: 0,
          rejectedApplications: 0
        });
      }

      // 2. Fetch recent offers
      try {
        const offersData = await candidateService.browseOffers({ page: 0, size: 3 });
        if (!ignore) setRecentOffers(offersData?.content || []);
      } catch (err) {
        console.warn("Could not load recent offers for candidate overview:", err);
        if (!ignore) setRecentOffers([]);
      }

      // 3. Fetch notifications
      try {
        const notifData = await candidateService.getNotifications();
        if (!ignore) setNotifications(notifData || []);
      } catch (err) {
        console.warn("Could not load notifications for candidate overview:", err);
        if (!ignore) setNotifications([]);
      }

      if (!ignore) setLoading(false);
    })();
    return () => { ignore = true; };
  }, [reloadKey]);


  const handleNotificationClick = async (notif) => {
    setActiveNotification(notif);
    if (!notif.read) {
      try {
        await candidateService.markNotificationRead(notif.id);
        // Refresh notifications locally
        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, read: true } : n));
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    }
  };

  const handleApplyClickFromModal = () => setShowApplyModal(true);

  const handleApplied = (offer) => {
    setShowApplyModal(false);
    setSelectedOffer(null);
    toast(`Your application for "${offer.title}" was sent.`);
    fetchData();
  };

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="page-stack">
      {loading ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          {unread.length > 0 && (
            <section className="glass-card stack accent-cyan" aria-labelledby="unread-title">
              <h2 id="unread-title" className="section-title text-accent">Unread messages</h2>
              {unread.map((notif) => (
                <button key={notif.id} type="button" className="notice" onClick={() => handleNotificationClick(notif)}>
                  <span className="grow">{notif.message}</span>
                  <span className="text-accent text-xs">Open</span>
                </button>
              ))}
            </section>
          )}

          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-title">Applications</div>
              <div className="stat-value">{stats.totalApplications}</div>
            </div>
            <div className="stat-card orange">
              <div className="stat-title">Pending review</div>
              <div className="stat-value">{stats.pendingApplications}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-title">Accepted</div>
              <div className="stat-value">{stats.acceptedApplications}</div>
            </div>
            <div className="stat-card red">
              <div className="stat-title">Rejected</div>
              <div className="stat-value">{stats.rejectedApplications}</div>
            </div>
          </div>

          <div className="grid-two">
            <section className="dashboard-panel">
              <div className="panel-header">
                <h2>Newest offers</h2>
                <button type="button" className="secondary-btn" onClick={() => navigate("/candidate-dashboard/offers")}>
                  All offers
                </button>
              </div>

              {recentOffers.length === 0 ? (
                <EmptyState title="No open offers right now" text="New offers appear here as soon as recruiters publish them." />
              ) : (
                <ul className="stack list-reset">
                  {recentOffers.map((offer) => (
                    <li key={offer.id}>
                      <button type="button" className="offer-card offer-card--compact card-button" onClick={() => setSelectedOffer(offer)}>
                        <h3>{offer.title}</h3>
                        <div className="offer-company">{offer.companyName}</div>
                        <div className="offer-meta">
                          <span>Location: {offer.location}</span>
                          <span>Contract: {offer.contractType}</span>
                          {offer.alreadyApplied && <span className="applied-flag">Applied</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dashboard-panel">
              <div className="panel-header">
                <h2>Messages</h2>
              </div>
              {notifications.length === 0 ? (
                <p className="text-muted text-sm">No messages yet. Interview invitations will appear here.</p>
              ) : (
                <ul className="message-list list-reset">
                  {notifications.map((notif) => (
                    <li key={notif.id}>
                      <button type="button" className={`message-item card-button ${notif.read ? "" : "message-item--unread"}`}
                        onClick={() => handleNotificationClick(notif)}>
                        <span className="row-between">
                          <span className="message-item__kind">{notif.read ? "Read" : "New invitation"}</span>
                          <span className="text-accent text-xs accent-cyan">Open</span>
                        </span>
                        <span className="truncate">{notif.message}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {selectedOffer && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--wide" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title">
            <div className="modal-header">
              <h2 id="offer-modal-title">Offer details</h2>
              <button type="button" className="close-btn" aria-label="Close" onClick={() => setSelectedOffer(null)}>×</button>
            </div>
            <div className="modal-body modal-body--scroll">
              <div className="offer-hero">
                <Avatar src={selectedOffer.companyLogo} name={selectedOffer.companyName} size="md" shape="rounded" />
                <div className="stack">
                  <h3 className="offer-hero__title">{selectedOffer.title}</h3>
                  <div className="offer-company">{selectedOffer.companyName}</div>
                  <div className="row text-sm text-muted">
                    <span>Location: {selectedOffer.location}</span>
                    <span>Contract: {selectedOffer.contractType}</span>
                    {selectedOffer.companyWebsite && (
                      <a href={selectedOffer.companyWebsite} target="_blank" rel="noreferrer" className="cv-link">
                        {selectedOffer.companyWebsite.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <h4 className="info-card__title">About the role</h4>
              <p className="body-text">{selectedOffer.description}</p>

              <div className="info-card">
                <h4 className="info-card__title">About {selectedOffer.companyName}</h4>
                <div className="info-card__grid">
                  <div>Industry: <strong>{selectedOffer.companyIndustry || "Not specified"}</strong></div>
                  <div>Headquarters: <strong>{selectedOffer.companyHeadquarters || "Not specified"}</strong></div>
                </div>
                {selectedOffer.companyDescription && <p className="info-card__text">{selectedOffer.companyDescription}</p>}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setSelectedOffer(null)}>Close</button>
              <button type="button" className="accent-btn accent-violet" onClick={() => setShowMatchModal(true)}>
                Check my CV match
              </button>
              {selectedOffer.alreadyApplied ? (
                <span className="state-badge accent-green">Already applied</span>
              ) : selectedOffer.expired ? (
                <span className="state-badge accent-red">Expired</span>
              ) : (
                <button type="button" className="primary-btn" onClick={handleApplyClickFromModal}>Apply Now</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showApplyModal && selectedOffer && (
        <ApplyModal offer={selectedOffer} onClose={() => setShowApplyModal(false)} onApplied={handleApplied} />
      )}

      {showMatchModal && selectedOffer && (
        <CvMatchModal
          key={selectedOffer.id}
          offer={selectedOffer}
          canApply={!selectedOffer.alreadyApplied && !selectedOffer.expired}
          onClose={() => setShowMatchModal(false)}
          onApply={() => { setShowMatchModal(false); setShowApplyModal(true); }}
        />
      )}

      {activeNotification && (
        <div className="modal-overlay">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="notification-title">
            <div className="modal-header">
              <h2 id="notification-title">Interview invitation</h2>
              <button type="button" className="close-btn" aria-label="Close" onClick={() => setActiveNotification(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="text-strong">{activeNotification.message}</p>
              {activeNotification.application?.interviewLetter ? (
                <>
                  <h4 className="info-card__title">Invitation letter</h4>
                  <pre className="letter-block">{activeNotification.application.interviewLetter}</pre>
                </>
              ) : (
                <p className="text-muted text-sm">No invitation letter is attached. Check "My applications" for updates.</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="primary-btn" onClick={() => setActiveNotification(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
