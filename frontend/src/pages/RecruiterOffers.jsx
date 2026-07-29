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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job offer?")) return;
    try {
      await recruiterService.deleteOffer(id);
      loadOffers();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete job offer. Make sure it has no active candidacies.");
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

  // Sort offers by closest deadline
  const sortedOffers = [...offers].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  return (
    <div>
      <div className="panel-header" style={{ marginBottom: "24px" }}>
        <h2>Active Job Openings ({offers.length})</h2>
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
            <div key={offer.id} className="offer-card">
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
              </div>
              <p className="offer-desc">{offer.description}</p>
              <div className="offer-meta-info">
                <div className="meta-item">
                  <span>📍</span> {offer.location}
                </div>
                <div className="meta-item">
                  <span>⏰</span> Deadline: {formatDate(offer.deadline)}
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
                <button 
                  className="btn-edit" 
                  onClick={() => navigate(`/recruiter-dashboard/edit-offer/${offer.id}`)}
                  style={{ flex: 1 }}
                >
                  Edit
                </button>
                <button 
                  className="btn-delete" 
                  onClick={() => handleDelete(offer.id)}
                  style={{ flex: 1 }}
                >
                  Delete
                </button>
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
    </div>
  );
}
