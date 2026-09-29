import { useState, useEffect, useRef } from "react";
import candidateService from "../services/candidateService";
import AlertModal from "../components/AlertModal";
import ApplyModal from "../components/ApplyModal";
import CvMatchModal from "../components/CvMatchModal";
import EmptyState from "../components/EmptyState";
import { SkeletonCards } from "../components/Skeleton";
import { useToast } from "../components/Toast";

const EMPTY_FILTERS = { keyword: "", location: "", contractType: "" };

export default function CandidateOffers() {
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  
  // Search filters: what's typed, and what the current results were searched with.
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const latestRequest = useRef(0);
  const toast = useToast();

  const [showApplyModal, setShowApplyModal] = useState(false);

  const [showMatchModal, setShowMatchModal] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchOffers();
  }, [page, appliedFilters]);

  const handleOpenMatch = (offer) => {
    if (!offer) return;
    setSelectedOffer(offer);
    setShowMatchModal(true);
  };

  // Only the latest search may update the list: an older, slower response
  // arriving afterwards must not overwrite newer results.
  const fetchOffers = async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const data = await candidateService.browseOffers({
        ...appliedFilters,
        page,
        size: 10
      });
      if (requestId !== latestRequest.current) return;
      const content = data.content || [];
      setOffers(content);
      setTotalPages(data.totalPages || 0);
      // Keep the selected offer if it's still in the list, else select the first one.
      setSelectedOffer((current) => content.find((o) => o.id === current?.id) || content[0] || null);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      console.error(err);
      setErrorMsg("Job offers couldn't be loaded. Please try again.");
      setShowAlert(true);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setAppliedFilters({ ...filters });
  };

  const hasFilters = Object.values(appliedFilters).some(Boolean);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(0);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const handleApplyClick = () => {
    if (selectedOffer) setShowApplyModal(true);
  };

  const handleApplied = (offer) => {
    setShowApplyModal(false);
    toast(`Your application for "${offer.title}" was sent.`);
    const updated = { ...offer, alreadyApplied: true };
    setSelectedOffer(updated);
    setOffers((all) => all.map((o) => (o.id === offer.id ? updated : o)));
  };

  const defaultLogo = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

  return (
    <div className="candidate-offers-page">
      {/* Search Filters form */}
      <form className="search-bar-container" onSubmit={handleSearchSubmit}>
        <div className="search-field">
          <label>Keyword</label>
          <input 
            type="text" 
            placeholder="Title, skills, keyword..." 
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
        </div>
        <div className="search-field">
          <label>Location</label>
          <input 
            type="text" 
            placeholder="City, region, remote..." 
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          />
        </div>
        <div className="search-field">
          <label>Contract Type</label>
          <select 
            value={filters.contractType}
            onChange={(e) => setFilters({ ...filters, contractType: e.target.value })}
          >
            <option value="">All Contracts</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="FREELANCE">Freelance</option>
            <option value="STAGE">Stage (Internship)</option>
          </select>
        </div>
        <button className="search-btn" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {loading && offers.length === 0 ? (
        <SkeletonCards count={4} />
      ) : offers.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No offers match your search"
            text="Try other keywords, another location or contract type."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState title="No open offers right now" text="New offers appear here as soon as recruiters publish them." />
        )
      ) : (
        <div className="offers-split-layout">
          {/* Offers list panel */}
          <div className="offers-list">
            {offers.map((offer) => (
              <div 
                key={offer.id} 
                className={`offer-card ${selectedOffer?.id === offer.id ? "active" : ""}`}
                onClick={() => setSelectedOffer(offer)}
              >
                <h3>
                  {offer.title}
                  {offer.newlyPublished && (
                    <span className="status-chip status-chip--new" style={{ marginLeft: 8 }} title="Published in the last 48 hours">
                      New
                    </span>
                  )}
                </h3>
                <div className="offer-company">
                  {offer.companyName}
                </div>
                <div className="offer-meta">
                  <span>Location: {offer.location}</span>
                  <span>Contract: {offer.contractType}</span>
                  {offer.alreadyApplied && (
                    <span style={{ color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
                      Applied
                    </span>
                  )}
                </div>

              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-row" style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "center" }}>
                <button 
                  disabled={page === 0}
                  className="secondary-btn" 
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", fontSize: "0.88rem" }}>
                  Page {page + 1} of {totalPages}
                </span>
                <button 
                  disabled={page >= totalPages - 1}
                  className="secondary-btn" 
                  style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Offer Details Panel */}
          {selectedOffer && (
            <div className="offer-details-panel">
              <div className="details-header">
                <h2>{selectedOffer.title}</h2>
                <div className="offer-company" style={{ fontSize: "1rem" }}>
                  Posted by {selectedOffer.companyName}
                </div>

                <div className="details-meta-row" style={{ marginTop: "14px" }}>
                  <div className="details-meta-item">Location: <strong>{selectedOffer.location}</strong></div>
                  <div className="details-meta-item">Contract: <strong>{selectedOffer.contractType}</strong></div>
                  {selectedOffer.deadline && (
                    <div className="details-meta-item">Deadline: <strong>{selectedOffer.deadline}</strong></div>
                  )}
                </div>

                <div style={{ marginTop: "20px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {selectedOffer.alreadyApplied ? (
                    <button className="primary-btn" disabled style={{ backgroundColor: "#10b981", cursor: "not-allowed", opacity: 0.8 }}>
                      Already Applied
                    </button>
                  ) : selectedOffer.expired ? (
                    <button className="primary-btn" disabled style={{ backgroundColor: "#ef4444", cursor: "not-allowed", opacity: 0.8 }}>
                      Expired
                    </button>
                  ) : (
                    <button className="primary-btn" onClick={handleApplyClick}>
                      Apply Now
                    </button>
                  )}

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => handleOpenMatch(selectedOffer)}
                    style={{
                      background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))",
                      border: "1px solid rgba(168, 85, 247, 0.5)",
                      color: "#c084fc",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: "600"
                    }}
                  >
                    <span>Check my CV match</span>
                  </button>
                </div>
              </div>


              {/* Company Details Section inside Offers detail view */}
              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", margin: "20px 0" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#60a5fa" }}>Company Details</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "10px" }}>
                  <div>Industry: <strong>{selectedOffer.companyIndustry || "Not specified"}</strong></div>
                  <div>Headquarters: <strong>{selectedOffer.companyHeadquarters || "Not specified"}</strong></div>
                </div>
                {selectedOffer.companyDescription && (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8", lineHeight: "1.5" }}>
                    {selectedOffer.companyDescription}
                  </p>
                )}
              </div>

              <div className="details-body">
                <h3>Role Description</h3>
                <div style={{ color: "#94a3b8", whiteSpace: "pre-wrap", marginTop: "10px" }}>
                  {selectedOffer.description}
                </div>
              </div>
            </div>
          )}
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
          onApply={() => { setShowMatchModal(false); handleApplyClick(); }}
        />
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

