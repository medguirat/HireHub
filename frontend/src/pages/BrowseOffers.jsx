import { useEffect, useState } from "react";
import candidateService from "../services/candidateService";
import AlertModal from "../components/AlertModal";

export default function BrowseOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [contractType, setContractType] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [cv, setCv] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async (overrideContractType) => {
    setLoading(true);
    try {
      const res = await candidateService.browseOffers({
        keyword: keyword || undefined,
        location: location || undefined,
        contractType: (overrideContractType !== undefined ? overrideContractType : contractType) || undefined,
      });
      setOffers(res.data.content);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOffers();
  };

  const clearFilters = () => {
    setKeyword("");
    setLocation("");
    setContractType("");
    setTimeout(() => fetchOffers(""), 0);
  };

  const selectContractType = (type) => {
    setContractType(type);
    fetchOffers(type);
  };

  const openApplyModal = (offer) => {
    setSelectedOffer(offer);
    setCv("");
    setCoverLetter("");
    setApplyModalOpen(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await candidateService.applyToOffer(selectedOffer.id, cv, coverLetter);
      setApplyModalOpen(false);
      setShowSuccess(true);
      fetchOffers();
    } catch (err) {
      console.error(err);
      setApplyModalOpen(false);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to apply.");
      setShowAlert(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="dashboard-panel" style={{ marginBottom: "24px" }}>
        <form onSubmit={handleSearch} className="search-bar-panel">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by title or keyword..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="search-input-wrapper" style={{ flex: 1, minWidth: "180px" }}>
            <span className="search-icon">📍</span>
            <input
              type="text"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <button type="submit" className="primary-btn">Search</button>
          <button type="button" className="secondary-btn" onClick={clearFilters}>Reset</button>
        </form>

        <div className="filter-pill-group">
          {["", "CDI", "CDD", "STAGE", "FREELANCE"].map((type) => (
            <button
              key={type || "all"}
              type="button"
              className={`filter-pill ${contractType === type ? "active" : ""}`}
              onClick={() => selectContractType(type)}
            >
              {type || "All Types"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-container">Loading offers...</div>
      ) : offers.length === 0 ? (
        <div className="empty-state">
          No job offers match your search right now. Try different keywords or check back later.
        </div>
      ) : (
        <div className="offers-grid">
          {offers.map((offer) => (
            <div key={offer.id} className="offer-card">
              <div className="offer-card-header">
                <h3>{offer.title}</h3>
                <span className={`contract-badge badge-${offer.contractType?.toLowerCase()}`}>
                  {offer.contractType}
                </span>
              </div>

              <p className="offer-desc">{offer.description}</p>

              <div className="offer-meta-info">
                <span className="meta-item">📍 {offer.location}</span>
                <span className="meta-item">
                  🏢 {offer.recruiterName} {offer.recruiterLastName}
                </span>
              </div>

              <div className="offer-actions">
                {offer.expired ? (
                  <button className="btn-edit" disabled style={{ flex: 1 }}>Expired</button>
                ) : offer.alreadyApplied ? (
                  <button className="btn-edit" disabled style={{ flex: 1 }}>Already Applied</button>
                ) : (
                  <button className="primary-btn" style={{ flex: 1 }} onClick={() => openApplyModal(offer)}>
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {applyModalOpen && selectedOffer && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(10,19,36,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setApplyModalOpen(false)}
        >
          <div
            className="dashboard-panel"
            style={{ maxWidth: "480px", width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <h2>Apply — {selectedOffer.title}</h2>
            </div>

            <form onSubmit={handleApplySubmit} className="form-grid">
              <div className="form-group form-full-width">
                <label>CV Link (Drive, LinkedIn, portfolio...) *</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={cv}
                  onChange={(e) => setCv(e.target.value)}
                  required
                />
              </div>

              <div className="form-group form-full-width">
                <label>Cover Letter</label>
                <textarea
                  placeholder="Tell the recruiter why you're a great fit..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                />
              </div>

              <div className="form-actions form-full-width">
                <button type="button" className="secondary-btn" onClick={() => setApplyModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal isOpen={showAlert} type="error" title="Application Failed" message={errorMsg} onClose={() => setShowAlert(false)} />
      <AlertModal isOpen={showSuccess} type="success" title="Success" message="Your application has been submitted!" onClose={() => setShowSuccess(false)} />
    </div>
  );
}