import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";

export default function RecruiterOffers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const data = await recruiterService.getOffers(0, 50);
      setOffers(data.content || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load active job offers.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  // An offer with applications is closed (archived) instead of deleted, so
  // nobody loses their application history; say which one will happen.
  const handleDelete = async (offer) => {
    const count = offer.applicationCount || 0;
    const question = count > 0
      ? `"${offer.title}" has ${count} application${count > 1 ? "s" : ""}, so it will be closed instead of deleted: ` +
        "candidates will no longer see it, and you keep access to its applicants. Close it?"
      : `Delete "${offer.title}"? This can't be undone.`;
    if (!window.confirm(question)) return;
    try {
      const result = await recruiterService.deleteOffer(offer.id);
      setInfoMsg(result.message);
      loadOffers();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "The offer couldn't be deleted. Please try again.");
      setShowAlert(true);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };


  // Newest first (server order), open offers before closed ones.
  const openOffers = offers.filter((o) => o.status !== "CLOSED");
  const sortedOffers = [...openOffers, ...offers.filter((o) => o.status === "CLOSED")];

  return (
    <div>
      <div className="panel-header" style={{ marginBottom: "24px" }}>
        <h2>Job offers ({openOffers.length} open, {offers.length - openOffers.length} closed)</h2>
        <button className="primary-btn" onClick={() => navigate("/recruiter-dashboard/create-offer")}>
          Create New Offer
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div>Loading your job offers...</div>
        </div>
      ) : sortedOffers.length === 0 ? (
        <div className="empty-state">
          You haven't posted any job offers yet. Create your first offer to attract talent!
        </div>
      ) : (
        <div className="offers-grid">
          {sortedOffers.map((offer) => (
            <div key={offer.id} className={`offer-card ${offer.status === "CLOSED" ? "offer-card--closed" : ""}`}>
              <div className="offer-card-header">
                <h3 
                  style={{ cursor: "pointer", color: "#60a5fa", transition: "color 0.2s" }}
                  onClick={() => navigate(`/recruiter-dashboard/offers/${offer.id}/applications`)}
                  onMouseOver={(e) => e.target.style.color = "#3b82f6"}
                  onMouseOut={(e) => e.target.style.color = "#60a5fa"}
                  title="Click to view applications for this offer"
                >
                  {offer.title}
                </h3>
                <span className={`contract-badge badge-${(offer.contractType || 'cdi').toLowerCase()}`}>
                  {offer.contractType || "CDI"}
                </span>
                {offer.status === "CLOSED" && <span className="status-chip status-chip--closed">Closed</span>}
              </div>
              <p className="offer-desc">{offer.description}</p>
              <div className="offer-meta-info">
                <div className="meta-item">
                  Location: {offer.location}
                </div>
                <div className="meta-item">
                  Deadline: {formatDate(offer.deadline)}
                </div>
                <div className="meta-item">
                  Applications: {offer.applicationCount ?? 0}
                </div>
              </div>
              <div className="offer-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button 
                  className="primary-btn" 
                  onClick={() => navigate(`/recruiter-dashboard/offers/${offer.id}/applications`)}
                  style={{ flex: "1 1 100%", fontSize: "0.85rem", padding: "8px 12px" }}
                >
                  Voir les candidatures
                </button>
                {offer.status !== "CLOSED" && (
                  <>
                    <button
                      className="btn-edit"
                      onClick={() => navigate(`/recruiter-dashboard/edit-offer/${offer.id}`)}
                      style={{ flex: 1 }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(offer)}
                      style={{ flex: 1 }}
                    >
                      {offer.applicationCount > 0 ? "Close offer" : "Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertModal
        isOpen={showAlert}
        type="error"
        title="Operation Failed"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />
      <AlertModal
        isOpen={!!infoMsg}
        type="success"
        title="Done"
        message={infoMsg}
        onClose={() => setInfoMsg("")}
      />
    </div>
  );
}
