import { useState, useEffect } from "react";
import candidateService from "../services/candidateService";
import AlertModal from "../components/AlertModal";
import CvMatchModal from "../components/CvMatchModal";

// Keep in sync with the backend's spring.servlet.multipart.max-file-size.
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Client-side file check so a bad file never even reaches the network:
 * wrong extension or over-size fails fast with a clear message instead of
 * waiting on a round trip (and, before Phase 1's backend fix, a confusing
 * generic 500).
 */
function validateFile(file, allowedExtensions) {
  if (!file) return null;
  const name = file.name.toLowerCase();
  const hasAllowedExtension = allowedExtensions.some((ext) => name.endsWith(ext));
  if (!hasAllowedExtension) {
    return `Please choose a ${allowedExtensions.join(" or ")} file.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB — please choose one under ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

export default function CandidateOffers() {
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  
  // Search Filters
  const [filters, setFilters] = useState({
    keyword: "",
    location: "",
    contractType: ""
  });

  // Application Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [cvFileError, setCvFileError] = useState("");
  const [coverLetterType, setCoverLetterType] = useState("text"); // "text" or "file"
  const [coverLetterText, setCoverLetterText] = useState("");
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [coverLetterFileError, setCoverLetterFileError] = useState("");
  const [applying, setApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const [showMatchModal, setShowMatchModal] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchOffers();
  }, [page]);

  const handleOpenMatch = (offer) => {
    if (!offer) return;
    setSelectedOffer(offer);
    setShowMatchModal(true);
  };

  const fetchOffers = async (resetPage = false) => {
    setLoading(true);
    const targetPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);

    try {
      const data = await candidateService.browseOffers({
        ...filters,
        page: targetPage,
        size: 10
      });
      setOffers(data.content || []);
      setTotalPages(data.totalPages || 0);

      // Select first offer by default if available
      if (data.content && data.content.length > 0) {
        if (resetPage || !selectedOffer) {
          setSelectedOffer(data.content[0]);
        } else {
          const updatedSelected = data.content.find(o => o.id === selectedOffer.id);
          if (updatedSelected) {
            setSelectedOffer(updatedSelected);
          } else {
            setSelectedOffer(data.content[0]);
          }
        }
      } else {
        setSelectedOffer(null);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to fetch job offers.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOffers(true);
  };

  const handleApplyClick = () => {
    if (!selectedOffer) return;
    setCvFile(null);
    setCvFileError("");
    setCoverLetterText("");
    setCoverLetterFile(null);
    setCoverLetterFileError("");
    setCoverLetterType("text");
    setShowApplyModal(true);
  };

  const submitApplication = async () => {
    if (!cvFile) {
      setErrorMsg("Please upload your CV in PDF format.");
      setShowAlert(true);
      return;
    }
    // Belt and braces: the input's onChange already blocks bad selections and
    // disables this button, but never trust client state alone.
    const cvError = validateFile(cvFile, [".pdf"]);
    if (cvError) {
      setErrorMsg(cvError);
      setShowAlert(true);
      return;
    }
    if (coverLetterType === "file" && coverLetterFile) {
      const clError = validateFile(coverLetterFile, [".pdf"]);
      if (clError) {
        setErrorMsg(clError);
        setShowAlert(true);
        return;
      }
    }

    setApplying(true);
    try {
      // 1. Upload CV file
      const cvUploadRes = await candidateService.uploadFile(cvFile);
      const cvUrl = cvUploadRes.url;

      // 2. Upload Cover Letter file if chosen, or use text
      let clValue = coverLetterText;
      if (coverLetterType === "file" && coverLetterFile) {
        const clUploadRes = await candidateService.uploadFile(coverLetterFile);
        clValue = clUploadRes.url;
      }

      // 3. Submit application
      await candidateService.createApplication(cvUrl, clValue, selectedOffer.id);
      
      setShowApplyModal(false);
      setSuccessMsg(`Successfully applied for the "${selectedOffer.title}" role.`);
      setShowSuccessAlert(true);

      // Refresh offer status (mark as alreadyApplied)
      const updatedOffer = { ...selectedOffer, alreadyApplied: true };
      setSelectedOffer(updatedOffer);
      setOffers(offers.map(o => o.id === selectedOffer.id ? updatedOffer : o));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to submit application.");
      setShowAlert(true);
    } finally {
      setApplying(false);
    }
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
            <option value="INTERNSHIP">Internship</option>
          </select>
        </div>
        <button className="search-btn" type="submit">
          Search
        </button>
      </form>

      {loading && offers.length === 0 ? (
        <div className="loading-container" style={{ color: "#94a3b8" }}>
          <div>Loading offers...</div>
        </div>
      ) : offers.length === 0 ? (
        <div className="empty-state" style={{ color: "#94a3b8", textAlign: "center", padding: "60px 0" }}>
          No job offers found matching your criteria.
        </div>
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
                <h3>{offer.title}</h3>
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

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenMatch(offer);
                  }}
                  style={{
                    marginTop: "10px",
                    width: "100%",
                    padding: "7px 12px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))",
                    border: "1px solid rgba(168, 85, 247, 0.4)",
                    color: "#c084fc",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.2s ease"
                  }}
                >
                  Check my CV match
                </button>
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

      {/* Apply Modal */}
      {showApplyModal && selectedOffer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Apply for {selectedOffer.title}</h2>
              <button className="close-btn" onClick={() => setShowApplyModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>CV / Resume (PDF Only, max {MAX_FILE_SIZE_MB} MB) *</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setCvFile(file || null);
                    setCvFileError(file ? validateFile(file, [".pdf"]) || "" : "");
                  }}
                  required
                  style={{ color: "#fff" }}
                />
                {cvFileError ? (
                  <small style={{ color: "#f87171", fontSize: "0.78rem", display: "block" }}>
                    {cvFileError}
                  </small>
                ) : (
                  <small style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
                    Upload a PDF version of your CV.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Cover Letter Format</label>
                <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.85rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name="offersClType" 
                      checked={coverLetterType === "text"} 
                      onChange={() => setCoverLetterType("text")}
                    />
                    Write letter
                  </label>
                  <label style={{ fontSize: "0.85rem", color: "#fff", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name="offersClType" 
                      checked={coverLetterType === "file"} 
                      onChange={() => setCoverLetterType("file")}
                    />
                    Upload PDF file
                  </label>
                </div>

                {coverLetterType === "text" ? (
                  <textarea 
                    rows="5" 
                    placeholder="Introduce yourself and list your motivations..." 
                    value={coverLetterText}
                    onChange={(e) => setCoverLetterText(e.target.value)}
                  />
                ) : (
                  <>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setCoverLetterFile(file || null);
                        setCoverLetterFileError(file ? validateFile(file, [".pdf"]) || "" : "");
                      }}
                      style={{ color: "#fff" }}
                    />
                    {coverLetterFileError && (
                      <small style={{ color: "#f87171", fontSize: "0.78rem", display: "block" }}>
                        {coverLetterFileError}
                      </small>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowApplyModal(false)} disabled={applying}>
                Cancel
              </button>
              <button
                className="primary-btn"
                onClick={submitApplication}
                disabled={applying || !!cvFileError || !!coverLetterFileError}
              >
                {applying ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
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
        title="Application Error"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />

      <AlertModal 
        isOpen={showSuccessAlert}
        type="success"
        title="Application Submitted"
        message={successMsg}
        onClose={() => setShowSuccessAlert(false)}
      />
    </div>
  );
}

