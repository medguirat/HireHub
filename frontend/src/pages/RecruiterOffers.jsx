import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";
import EmptyState from "../components/EmptyState";
import { SkeletonCards } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import fetchAllPages from "../utils/fetchAllPages";
import { formatDate } from "../utils/format";

export default function RecruiterOffers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [busyOfferId, setBusyOfferId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    try {
      setOffers(await fetchAllPages(recruiterService.getOffers));
    } catch (err) {
      console.error(err);
      setErrorMsg("Your job offers couldn't be loaded. Please refresh the page.");
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
    setBusyOfferId(offer.id);
    try {
      const result = await recruiterService.deleteOffer(offer.id);
      toast(result.message);
      loadOffers();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "The offer couldn't be deleted. Please try again.");
      setShowAlert(true);
    } finally {
      setBusyOfferId(null);
    }
  };



  // Newest first (server order), open offers before closed ones.
  const openOffers = offers.filter((o) => o.status !== "CLOSED");
  const sortedOffers = [...openOffers, ...offers.filter((o) => o.status === "CLOSED")];

  return (
    <div>
      <div className="panel-header panel-header--spaced">
        <h2>{loading ? "Loading…" : `${openOffers.length} open · ${offers.length - openOffers.length} closed`}</h2>
        <button className="primary-btn" onClick={() => navigate("/recruiter-dashboard/create-offer")}>
          New job offer
        </button>
      </div>

      {loading ? (
        <SkeletonCards count={3} />
      ) : sortedOffers.length === 0 ? (
        <EmptyState
          title="No job offers yet"
          text="Publish your first offer and candidates will see it right away."
          actionLabel="Create your first offer"
          onAction={() => navigate("/recruiter-dashboard/create-offer")}
        />
      ) : (
        <div className="offers-grid">
          {sortedOffers.map((offer) => (
            <div key={offer.id} className={`offer-card ${offer.status === "CLOSED" ? "offer-card--closed" : ""}`}>
              <div className="offer-card-header">
                <h3>{offer.title}</h3>
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
                  Deadline: {formatDate(offer.deadline, "none")}
                </div>
              </div>
              <div className="offer-actions">
                <button 
                  className="primary-btn offer-actions__main"
                  onClick={() => navigate(`/recruiter-dashboard/offers/${offer.id}/applications`)}
                >
                  View applications ({offer.applicationCount ?? 0})
                </button>
                {offer.status !== "CLOSED" && (
                  <>
                    <button
                      className="btn-edit offer-actions__half"
                      onClick={() => navigate(`/recruiter-dashboard/edit-offer/${offer.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete offer-actions__half"
                      onClick={() => handleDelete(offer)}
                      disabled={busyOfferId === offer.id}
                    >
                      {busyOfferId === offer.id ? "Working…" : offer.applicationCount > 0 ? "Close offer" : "Delete"}
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
        title="Something went wrong"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}
