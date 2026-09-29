import { useState, useEffect } from "react";
import candidateService from "../services/candidateService";
import aiService from "../services/aiService";
import AlertModal from "../components/AlertModal";

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

  // AI Matching Modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [candidateProfileData, setCandidateProfileData] = useState(null);
  const [aiCvFile, setAiCvFile] = useState(null);
  const [aiCvFileError, setAiCvFileError] = useState("");
  const [aiCvText, setAiCvText] = useState("");
  const [aiCvStep, setAiCvStep] = useState("upload"); // "upload" | "result"
  const [aiCvFileName, setAiCvFileName] = useState("");

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchOffers();
    fetchCandidateProfile();
  }, [page]);

  const fetchCandidateProfile = async () => {
    try {
      const prof = await candidateService.getProfile();
      setCandidateProfileData(prof);
      if (prof?.bio && prof.bio.trim().length > 10) {
        setAiCvText(prof.bio);
      }
    } catch (err) {
      console.warn("Could not fetch candidate profile for AI match:", err);
    }
  };

  const handleOpenAiModal = (offerToAnalyze) => {
    const target = offerToAnalyze || selectedOffer;
    if (!target) return;
    setSelectedOffer(target);
    setShowAiModal(true);
    setAiCvStep("upload");
    setAiResult(null);
    setAiCvFileError("");
  };

  const extractTextFromFile = (file) => {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target.result;
        if (typeof buffer === "string") {
          resolve(buffer);
        } else {
          const bytes = new Uint8Array(buffer);
          let extractedStr = "";
          for (let i = 0; i < bytes.length; i++) {
            const charCode = bytes[i];
            if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13) {
              extractedStr += String.fromCharCode(charCode);
            } else {
              extractedStr += " ";
            }
          }
          resolve(extractedStr);
        }
      };
      reader.onerror = () => resolve("");
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleAnalyzeCvSubmit = async () => {
    if (!aiCvFile && !aiCvText.trim()) {
      setErrorMsg("Please upload your CV (PDF/DOC) or paste your CV text to perform AI matching.");
      setShowAlert(true);
      return;
    }
    if (aiCvFile) {
      const fileError = validateFile(aiCvFile, [".pdf", ".doc", ".docx"]);
      if (fileError) {
        setErrorMsg(fileError);
        setShowAlert(true);
        return;
      }
    }

    setAnalyzingAi(true);
    try {
      let fileExtractedText = "";

      if (aiCvFile) {
        setAiCvFileName(aiCvFile.name);
        fileExtractedText = await extractTextFromFile(aiCvFile);
        try {
          await candidateService.uploadFile(aiCvFile);
        } catch (uErr) {
          console.warn("CV background upload notice:", uErr.message);
        }
      }

      // Gather full candidate profile context (bio, headline, skills, past experience)
      const profBio = candidateProfileData?.bio || "";
      const profHeadline = candidateProfileData?.headline || "";
      const profExps = (candidateProfileData?.experiences || []).map(e => `${e.title} ${e.company} ${e.description}`).join(" ");
      const candSkills = candidateProfileData?.skills || [];

      // Combine text sources for thorough matching
      const fullCvTextContent = `${aiCvText} ${fileExtractedText} ${profBio} ${profHeadline} ${profExps} ${aiCvFileName || ""}`;

      const extractedCvSkills = aiService.fallbackExtractSkills(fullCvTextContent);
      const combinedCandidateSkills = Array.from(new Set([...candSkills, ...extractedCvSkills]));

      // Extract required skills from selected offer description
      const offerInfo = await aiService.extractOfferInfo(selectedOffer.title, selectedOffer.description);
      const requiredSkills = offerInfo.skills.length > 0 ? offerInfo.skills : [selectedOffer.title];

      const res = await aiService.analyzeMatch(
        fullCvTextContent,
        `${selectedOffer.title} ${selectedOffer.description}`,
        combinedCandidateSkills,
        requiredSkills
      );

      setAiResult(res);
      setAiCvStep("result");
    } catch (err) {
      console.error("AI CV Match error:", err);
      setErrorMsg("Failed to analyze CV and generate compatibility score.");
      setShowAlert(true);
    } finally {
      setAnalyzingAi(false);
    }
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
                    handleOpenAiModal(offer);
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
                  ✨ Conformité IA & Score CV
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

                  {/* AI Match Button */}
                  <button 
                    type="button"
                    className="secondary-btn"
                    onClick={() => handleOpenAiModal(selectedOffer)}
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
                    <span>✨ Analyser la Conformité IA & Score CV</span>
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

      {/* AI CV Compatibility & Roadmap Modal */}
      {showAiModal && (
        <div className="modal-overlay" style={{ backdropFilter: "blur(12px)", padding: "16px" }}>
          <div className="modal-content" style={{
            maxWidth: "600px",
            width: "92%",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            borderRadius: "22px",
            border: "1px solid rgba(168, 85, 247, 0.45)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.75)",
            overflow: "hidden",
            padding: 0
          }}>
            <div className="modal-header" style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.5rem" }}>📄</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#fff" }}>AI CV Match & Skill Roadmap</h2>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#a78bfa" }}>
                    Evaluating CV alignment for <strong>{selectedOffer?.title}</strong>
                  </p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowAiModal(false)}>×</button>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
              {analyzingAi ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#c084fc" }}>
                  <div style={{ fontSize: "2.2rem", marginBottom: "12px", animation: "spin 2s linear infinite" }}>⚙️</div>
                  <div style={{ fontWeight: "600", fontSize: "1.1rem" }}>Reading & Analyzing Your CV with AI...</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "6px" }}>Comparing your qualifications against job requirements</div>
                </div>
              ) : aiCvStep === "upload" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    padding: "16px",
                    borderRadius: "12px"
                  }}>
                    <h4 style={{ margin: "0 0 6px 0", color: "#818cf8", fontSize: "1.05rem" }}>
                      1. Upload or Provide Your CV
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.86rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                      Our AI engine evaluates your genuine compatibility score, skill gaps, and learning roadmap by analyzing your actual CV file or resume text.
                    </p>
                  </div>

                  <div className="form-group">
                    <label style={{ color: "#fff", fontWeight: "600" }}>Upload CV File (PDF / DOC, max {MAX_FILE_SIZE_MB} MB)</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const fileError = validateFile(file, [".pdf", ".doc", ".docx"]);
                          setAiCvFileError(fileError || "");
                          if (fileError) {
                            setAiCvFile(null);
                            setAiCvFileName("");
                            return;
                          }
                          setAiCvFile(file);
                          setAiCvFileName(file.name);
                        }
                      }}
                      style={{ color: "#fff", backgroundColor: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    {aiCvFileError ? (
                      <span style={{ fontSize: "0.8rem", color: "#f87171", marginTop: "4px", display: "block" }}>
                        {aiCvFileError}
                      </span>
                    ) : aiCvFileName && (
                      <span style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "4px", display: "block" }}>
                        Selected CV: 📄 <strong>{aiCvFileName}</strong>
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label style={{ color: "#fff", fontWeight: "600" }}>Or Paste CV Summary / Key Skills</label>
                    <textarea 
                      rows="4"
                      placeholder="Paste text from your CV, past experiences, or technical skills..."
                      value={aiCvText}
                      onChange={(e) => setAiCvText(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleAnalyzeCvSubmit}
                    disabled={!!aiCvFileError}
                    style={{
                      background: "linear-gradient(135deg, #6366f1, #a855f7)",
                      padding: "14px",
                      fontSize: "1rem",
                      fontWeight: "600",
                      marginTop: "10px"
                    }}
                  >
                    ⚡ Analyze My CV for this Job Offer
                  </button>
                </div>
              ) : aiResult ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Selected CV indication */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: "0.84rem", color: "#94a3b8" }}>
                      Analyzed CV: <strong style={{ color: "#fff" }}>{aiCvFileName || "Submitted CV Resume"}</strong>
                    </span>
                    <button 
                      type="button"
                      className="secondary-btn"
                      onClick={() => setAiCvStep("upload")}
                      style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                    >
                      🔄 Change CV
                    </button>
                  </div>

                  {/* Score Card */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    background: "linear-gradient(135deg, rgba(30, 27, 75, 0.6), rgba(88, 28, 135, 0.4))",
                    padding: "20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(168, 85, 247, 0.3)"
                  }}>
                    <div style={{
                      width: "84px",
                      height: "84px",
                      borderRadius: "50%",
                      background: aiResult.compatibility_score >= 80 ? "radial-gradient(circle, #10b981, #047857)" : aiResult.compatibility_score >= 60 ? "radial-gradient(circle, #6366f1, #4338ca)" : "radial-gradient(circle, #f59e0b, #b45309)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      boxShadow: "0 0 20px rgba(168, 85, 247, 0.4)"
                    }}>
                      <span style={{ fontSize: "1.45rem", fontWeight: "800", lineHeight: 1 }}>{aiResult.compatibility_score}%</span>
                      <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Match</span>
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: "0 0 6px 0", color: "#fff", fontSize: "1.1rem" }}>
                        {aiResult.compatibility_score >= 80 ? "🎯 High CV Compatibility!" : aiResult.compatibility_score >= 60 ? "👍 Good Fit with Potential" : "💡 Growth Opportunity"}
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.86rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                        {aiResult.compatibility_score >= 80 
                          ? "Your CV aligns extremely well with the requirements for this role. You are a top candidate!" 
                          : aiResult.compatibility_score >= 60 
                          ? "Your CV meets several core requirements. Closing a few skill gaps will make your application stand out even more." 
                          : "This role requires specific competencies you can acquire using our AI recommended roadmap below."}
                      </p>
                    </div>
                  </div>

                  {/* Missing Skills Gap */}
                  <div>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", color: "#a78bfa", display: "flex", alignItems: "center", gap: "6px" }}>
                      🔍 Skill Gap Analysis
                    </h4>
                    {aiResult.missing_skills && aiResult.missing_skills.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {aiResult.missing_skills.map((skill, idx) => (
                          <span key={idx} style={{
                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            color: "#fca5a5",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "0.82rem",
                            fontWeight: "500"
                          }}>
                            Missing: {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "#10b981", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
                        ✅ Your CV contains all key technical skills requested in this offer!
                      </div>
                    )}
                  </div>

                  {/* Recommendations / Conseils d'amélioration */}
                  {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                    <div style={{
                      backgroundColor: "rgba(59, 130, 246, 0.08)",
                      border: "1px solid rgba(59, 130, 246, 0.25)",
                      borderRadius: "12px",
                      padding: "16px"
                    }}>
                      <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", color: "#60a5fa", display: "flex", alignItems: "center", gap: "6px" }}>
                        💡 Conseils d'Amélioration du CV pour cette Offre
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "#cbd5e1", fontSize: "0.86rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {aiResult.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Career Learning Roadmap */}
                  {aiResult.roadmap && aiResult.roadmap.length > 0 && (
                    <div>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#a78bfa", display: "flex", alignItems: "center", gap: "6px" }}>
                        🗺️ Personalized Learning Roadmap
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {aiResult.roadmap.map((item, index) => (
                          <div key={index} style={{
                            backgroundColor: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px"
                          }}>
                            <div>
                              <div style={{ fontWeight: "600", fontSize: "0.88rem", color: "#fff" }}>
                                {index + 1}. {item.action}
                              </div>
                              <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px" }}>
                                Recommended Resource: <strong style={{ color: "#cbd5e1" }}>{item.ressource}</strong>
                              </div>
                            </div>
                            <div style={{
                              backgroundColor: "rgba(168, 85, 247, 0.15)",
                              color: "#c084fc",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              whiteSpace: "nowrap"
                            }}>
                              ⏱️ {item.duree_semaines} {typeof item.duree_semaines === 'number' ? 'weeks' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="modal-footer" style={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "16px 22px", display: "flex", justifyContent: "space-between" }}>
              <button className="secondary-btn" onClick={() => setShowAiModal(false)}>
                Close
              </button>
              {aiCvStep === "result" && !selectedOffer?.alreadyApplied && !selectedOffer?.expired && (
                <button className="primary-btn" onClick={() => { setShowAiModal(false); handleApplyClick(); }}>
                  Proceed to Apply Now
                </button>
              )}
            </div>
          </div>
        </div>
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

