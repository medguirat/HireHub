import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import candidateService from "../services/candidateService";
import AlertModal from "../components/AlertModal";
import ApplyModal from "../components/ApplyModal";
import CvMatchModal from "../components/CvMatchModal";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { useToast } from "../components/Toast";

export default function CandidateOverview() {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0
  });
  const [recentOffers, setRecentOffers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  // Detail Modal State
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const toast = useToast();

  // Notification Modal State
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let hasCriticalError = false;

    // 1. Fetch dashboard stats
    try {
      const statsData = await candidateService.getDashboard();
      if (statsData) setStats(statsData);
    } catch (err) {
      console.warn("Could not load candidate dashboard stats:", err);
      // Default fallback stats if backend endpoint is initializing
      setStats({
        totalApplications: 0,
        pendingApplications: 0,
        acceptedApplications: 0,
        rejectedApplications: 0
      });
    }

    // 2. Fetch recent offers
    try {
      const offersData = await candidateService.browseOffers({ page: 0, size: 3 });
      setRecentOffers(offersData?.content || []);
    } catch (err) {
      console.warn("Could not load recent offers for candidate overview:", err);
      setRecentOffers([]);
    }

    // 3. Fetch notifications
    try {
      const notifData = await candidateService.getNotifications();
      setNotifications(notifData || []);
    } catch (err) {
      console.warn("Could not load notifications for candidate overview:", err);
      setNotifications([]);
    }

    setLoading(false);
  };

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

  const defaultLogo = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

  return (
    <div className="candidate-overview-dashboard">
      {loading ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          {/* Notifications Alerts Section */}
          {notifications.filter(n => !n.read).length > 0 && (
            <div className="dashboard-panel" style={{ border: "1px solid rgba(59, 130, 246, 0.3)", backgroundColor: "rgba(59, 130, 246, 0.05)", padding: "16px", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", fontWeight: "600", color: "#60a5fa" }}>
                Unread Messages
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {notifications.filter(n => !n.read).map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    style={{ 
                      padding: "10px 14px", 
                      borderRadius: "8px", 
                      backgroundColor: "rgba(255, 255, 255, 0.03)", 
                      cursor: "pointer", 
                      fontSize: "0.88rem", 
                      borderLeft: "4px solid #3b82f6",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span>{notif.message}</span>
                    <span style={{ fontSize: "0.75rem", color: "#60a5fa", textDecoration: "underline" }}>View Invitation</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-title">Total Applications</div>
              <div className="stat-value">{stats.totalApplications}</div>
            </div>
            <div className="stat-card orange">
              <div className="stat-title">Pending Review</div>
              <div className="stat-value">{stats.pendingApplications}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-title">Accepted Offers</div>
              <div className="stat-value">{stats.acceptedApplications}</div>
            </div>
            <div className="stat-card red">
              <div className="stat-title">Rejected Applications</div>
              <div className="stat-value">{stats.rejectedApplications}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "24px", marginTop: "24px" }}>
            {/* Recent Opportunities */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <h2>Newest offers</h2>
                <button className="secondary-btn" onClick={() => navigate("/candidate-dashboard/offers")}>
                  All offers
                </button>
              </div>

              {recentOffers.length === 0 ? (
                <EmptyState title="No open offers right now" text="New offers appear here as soon as recruiters publish them." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {recentOffers.map((offer) => (
                    <div 
                      key={offer.id} 
                      className="offer-card"
                      onClick={() => setSelectedOffer(offer)}
                      style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", cursor: "pointer" }}
                    >
                      <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem" }}>{offer.title}</h3>
                      <div className="offer-company" style={{ fontSize: "0.85rem", color: "#3b82f6", marginBottom: "8px" }}>
                        {offer.companyName}
                      </div>
                      <div className="offer-meta" style={{ display: "flex", gap: "12px", fontSize: "0.78rem", color: "#94a3b8" }}>
                        <span>Location: {offer.location}</span>
                        <span>Contract: {offer.contractType}</span>
                        {offer.alreadyApplied && (
                          <span style={{ color: "#10b981" }}>Applied</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notification History Feed */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <h2>Messages</h2>
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
                {notifications.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>
                    No notifications to display.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{ 
                        padding: "10px 12px", 
                        borderRadius: "8px", 
                        backgroundColor: notif.read ? "rgba(255,255,255,0.01)" : "rgba(59, 130, 246, 0.05)", 
                        border: notif.read ? "1px solid var(--border-color)" : "1px solid rgba(59,130,246,0.2)",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        color: notif.read ? "#94a3b8" : "#ffffff"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontWeight: notif.read ? "normal" : "600" }}>
                          {notif.read ? "Read Message" : "New Invitation"}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#60a5fa" }}>View</span>
                      </div>
                      <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Opportunity Details & Company Profile Modal */}
      {selectedOffer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "700px" }}>
            <div className="modal-header">
              <h2>Opportunity Details</h2>
              <button className="close-btn" onClick={() => setSelectedOffer(null)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
              
              {/* Job Offer Header */}
              <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "20px", marginBottom: "20px" }}>
                <img 
                  src={selectedOffer.companyLogo || defaultLogo} 
                  alt="Company Logo"
                  style={{ width: "80px", height: "80px", borderRadius: "12px", objectFit: "cover", backgroundColor: "rgba(255,255,255,0.05)" }}
                  onError={(e) => { e.target.src = defaultLogo; }}
                />
                <div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "1.4rem" }}>{selectedOffer.title}</h3>
                  <div style={{ fontSize: "1rem", color: "#3b82f6", fontWeight: "600", marginBottom: "6px" }}>
                    {selectedOffer.companyName}
                  </div>
                  <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", color: "#94a3b8" }}>
                    <span>Location: {selectedOffer.location}</span>
                    <span>Contract: {selectedOffer.contractType}</span>
                    {selectedOffer.companyWebsite && (
                      <span>
                        Website: <a href={selectedOffer.companyWebsite} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>{selectedOffer.companyWebsite.replace(/^https?:\/\//, "")}</a>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#60a5fa" }}>Role Description</h4>
                <p style={{ color: "#d1d5db", fontSize: "0.92rem", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  {selectedOffer.description}
                </p>
              </div>

              {/* Company Profile Details */}
              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#60a5fa" }}>Company Profile</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "12px" }}>
                  <div>Industry: <strong style={{ color: "#fff" }}>{selectedOffer.companyIndustry || "Not specified"}</strong></div>
                  <div>Headquarters: <strong style={{ color: "#fff" }}>{selectedOffer.companyHeadquarters || "Not specified"}</strong></div>
                </div>
                {selectedOffer.companyDescription && (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
                    {selectedOffer.companyDescription}
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ gap: "10px", flexWrap: "wrap" }}>
              <button className="secondary-btn" onClick={() => setSelectedOffer(null)}>
                Close
              </button>
              <button className="secondary-btn" onClick={() => setShowMatchModal(true)}>
                Check my CV match
              </button>
              {selectedOffer.alreadyApplied ? (
                <button className="primary-btn" disabled style={{ backgroundColor: "#10b981", cursor: "not-allowed" }}>
                  Already Applied
                </button>
              ) : selectedOffer.expired ? (
                <button className="primary-btn" disabled style={{ backgroundColor: "#ef4444", cursor: "not-allowed" }}>
                  Expired
                </button>
              ) : (
                <button className="primary-btn" onClick={handleApplyClickFromModal}>
                  Apply Now
                </button>
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

      {/* Notification View Modal */}
      {activeNotification && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "550px" }}>
            <div className="modal-header">
              <h2>Interview Invitation Details</h2>
              <button className="close-btn" onClick={() => setActiveNotification(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: "#fff", fontSize: "0.95rem", paddingBottom: "10px", borderBottom: "1px solid var(--border-color)" }}>
                {activeNotification.message}
              </p>
              
              {activeNotification.application?.interviewLetter ? (
                <div style={{ marginTop: "16px" }}>
                  <h4 style={{ color: "#60a5fa", marginBottom: "8px" }}>Official Invitation Letter</h4>
                  <pre 
                    style={{ 
                      backgroundColor: "rgba(0,0,0,0.2)", 
                      padding: "16px", 
                      borderRadius: "8px", 
                      border: "1px solid var(--border-color)",
                      color: "#d1d5db", 
                      fontSize: "0.85rem",
                      whiteSpace: "pre-wrap",
                      fontFamily: "inherit"
                    }}
                  >
                    {activeNotification.application.interviewLetter}
                  </pre>
                </div>
              ) : (
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic", marginTop: "10px" }}>
                  No invitation letter text has been attached. Check "My Applications" for updates.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="primary-btn" onClick={() => setActiveNotification(null)}>
                Dismiss
              </button>
            </div>
          </div>
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
