import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import aiService from "../services/aiService";
import AlertModal from "../components/AlertModal";

export default function RecruiterProfile() {
  const { user, setUser } = useOutletContext();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // States for forms
  const [basicForm, setBasicForm] = useState({
    firstName: "",
    lastName: ""
  });

  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    website: "",
    logo: "",
    description: "",
    foundedYear: "",
    industry: "",
    mission: "",
    vision: "",
    companyValues: "",
    googleMapsUrl: "",
    headquarters: "",
    offices: "",
    companySize: "",
    companyType: "",
    technologies: "",
    phone: "",
    linkedin: "",
    facebook: "",
    instagram: "",
    twitter: ""
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showAiPitchModal, setShowAiPitchModal] = useState(false);
  const [generatingPitch, setGeneratingPitch] = useState(false);

  const handleLogoFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const uploadRes = await recruiterService.uploadFile(file);
      setCompanyForm(prev => ({ ...prev, logo: uploadRes.url }));
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to upload company logo.");
      setShowAlert(true);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Load profile from the backend on mount
  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const profile = await recruiterService.getProfile();
        if (active) {
          setCompanyForm({
            companyName: profile.companyName || "",
            website: profile.website || "",
            logo: profile.logo || "",
            description: profile.description || "",
            foundedYear: profile.foundedYear || "",
            industry: profile.industry || "",
            mission: profile.mission || "",
            vision: profile.vision || "",
            companyValues: profile.companyValues || "",
            googleMapsUrl: profile.googleMapsUrl || "",
            headquarters: profile.headquarters || "",
            offices: profile.offices || "",
            companySize: profile.companySize || "",
            companyType: profile.companyType || "",
            technologies: profile.technologies || "",
            phone: profile.phone || "",
            linkedin: profile.linkedin || "",
            facebook: profile.facebook || "",
            instagram: profile.instagram || "",
            twitter: profile.twitter || ""
          });

          setBasicForm({
            firstName: profile.firstName || "",
            lastName: profile.lastName || ""
          });

          // Sync with layout context
          setUser(prev => ({
            ...prev,
            firstName: profile.firstName || prev?.firstName,
            lastName: profile.lastName || prev?.lastName,
            recruiterProfile: profile
          }));
        }
      } catch (err) {
        console.error("Failed to load recruiter profile:", err);
        setErrorMsg("Failed to load recruiter profile information.");
        setShowAlert(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProfile();
    return () => { active = false; };
  }, [setUser]);

  // Company Completeness Score
  const calculateCompanyCompleteness = () => {
    let score = 0;
    if (companyForm.companyName) score += 15;
    if (companyForm.website) score += 10;
    if (companyForm.logo) score += 10;
    if (companyForm.description && companyForm.description.length > 20) score += 15;
    if (companyForm.industry) score += 10;
    if (companyForm.headquarters) score += 10;
    if (companyForm.technologies) score += 10;
    if (companyForm.mission || companyForm.vision) score += 10;
    if (companyForm.linkedin || companyForm.phone) score += 10;
    return Math.min(100, score);
  };

  const completenessScore = calculateCompanyCompleteness();

  const handleGenerateAiPitch = async () => {
    setGeneratingPitch(true);
    try {
      const promptText = `Company: ${companyForm.companyName || "Innovate Corp"}, Industry: ${companyForm.industry || "Software & Tech"}, Technologies: ${companyForm.technologies || "Cloud, Web, Mobile"}`;
      const res = await aiService.generateBio(
        `${companyForm.companyName || "Our Tech Team"}`,
        companyForm.technologies ? companyForm.technologies.split(",").map(t => t.trim()) : ["Engineering", "Innovation"],
        promptText
      );
      if (res?.generated_bio) {
        setCompanyForm(prev => ({
          ...prev,
          description: `At ${companyForm.companyName || "our company"}, we are pioneering the future of technology. ${res.generated_bio} We empower top talent with autonomy and growth opportunities.`
        }));
        setShowSuccess(true);
      }
    } catch (err) {
      console.error("AI Pitch Error:", err);
      setErrorMsg("Failed to generate company description.");
      setShowAlert(true);
    } finally {
      setGeneratingPitch(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const formatUrl = (urlStr) => {
        if (!urlStr) return "";
        const trimmed = urlStr.trim();
        if (!trimmed) return "";
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
      };

      const formattedWebsite = formatUrl(companyForm.website);
      const formattedGoogleMaps = formatUrl(companyForm.googleMapsUrl);
      const formattedLinkedin = formatUrl(companyForm.linkedin);
      const formattedFacebook = formatUrl(companyForm.facebook);
      const formattedInstagram = formatUrl(companyForm.instagram);
      const formattedTwitter = formatUrl(companyForm.twitter);

      const updatedUser = await recruiterService.updateBasicInfo({
        firstName: basicForm.firstName,
        lastName: basicForm.lastName
      });

      const updatedProfile = await recruiterService.updateProfile({
        companyName: companyForm.companyName,
        website: formattedWebsite,
        logo: companyForm.logo,
        description: companyForm.description,
        foundedYear: companyForm.foundedYear ? parseInt(companyForm.foundedYear) : null,
        industry: companyForm.industry,
        mission: companyForm.mission,
        vision: companyForm.vision,
        companyValues: companyForm.companyValues,
        googleMapsUrl: formattedGoogleMaps,
        headquarters: companyForm.headquarters,
        offices: companyForm.offices,
        companySize: companyForm.companySize,
        companyType: companyForm.companyType,
        technologies: companyForm.technologies,
        phone: companyForm.phone,
        linkedin: formattedLinkedin,
        facebook: formattedFacebook,
        instagram: formattedInstagram,
        twitter: formattedTwitter
      });

      setUser(prev => ({
        ...prev,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        recruiterProfile: updatedProfile
      }));

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const updatedStored = {
          ...parsed,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          recruiterProfile: {
            companyName: updatedProfile.companyName,
            logo: updatedProfile.logo,
            headquarters: updatedProfile.headquarters
          }
        };
        localStorage.setItem("user", JSON.stringify(updatedStored));
      }

      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || 
        err.response?.data || 
        "Failed to update profile. Please verify that all input fields are correct."
      );
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const defaultLogo = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

  return (
    <div 
      style={{ 
        maxWidth: "960px", 
        margin: "0 auto", 
        textAlign: "left"
      }}
    >
      {/* Top Header Summary Card & Live Candidate Preview */}
      <div 
        className="dashboard-panel" 
        style={{ 
          marginBottom: "32px",
          padding: "28px",
          position: "relative",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.3)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div style={{ position: "relative" }}>
            <img 
              src={companyForm.logo || defaultLogo} 
              alt="Company Logo Preview" 
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "16px",
                objectFit: "cover",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "3px solid #3b82f6",
                padding: "3px",
                boxShadow: "0 8px 24px rgba(59, 130, 246, 0.25)"
              }}
              onError={(e) => { e.target.src = defaultLogo; }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "700", color: "#fff" }}>
                {companyForm.companyName || "Your Company Profile"}
              </h2>
              {completenessScore >= 80 && (
                <span style={{
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  padding: "4px 10px",
                  borderRadius: "16px",
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  ✔ Verified Top Employer
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "0.92rem", color: "var(--text-secondary)", marginTop: "8px" }}>
              <span>📍 {companyForm.headquarters || "Headquarters not set"}</span>
              {companyForm.industry && <span>🏢 {companyForm.industry}</span>}
              {companyForm.companySize && <span>👥 {companyForm.companySize} employees</span>}
            </div>

            {/* Tech Stack Pills Preview */}
            {companyForm.technologies && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
                {companyForm.technologies.split(",").map((tech, idx) => (
                  <span key={idx} style={{
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    color: "#93c5fd",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: "500"
                  }}>
                    {tech.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <button 
              type="button"
              className="primary-btn"
              onClick={handleGenerateAiPitch}
              disabled={generatingPitch}
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "600",
                fontSize: "0.88rem",
                padding: "10px 16px"
              }}
            >
              <span>{generatingPitch ? "Generating Pitch..." : "✨ AI Company Description Generator"}</span>
            </button>
          </div>
        </div>

        {/* Company Profile Completeness Meter */}
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "8px" }}>
            <span style={{ color: "#94a3b8", fontWeight: "500" }}>Company Profile Completeness</span>
            <span style={{ color: completenessScore >= 80 ? "#10b981" : "#60a5fa", fontWeight: "700" }}>{completenessScore}% Complete</span>
          </div>
          <div style={{ height: "8px", width: "100%", backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${completenessScore}%`,
              background: "linear-gradient(90deg, #3b82f6, #10b981)",
              borderRadius: "4px",
              transition: "width 0.6s ease-in-out"
            }} />
          </div>
        </div>
      </div>


      <form onSubmit={handleSaveProfile}>
        
        {/* Representative Section */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "#60a5fa", display: "flex", alignItems: "center", gap: "8px" }}>
            Corporate Representative
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>First Name *</label>
              <input 
                type="text" 
                value={basicForm.firstName}
                onChange={(e) => setBasicForm({ ...basicForm, firstName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input 
                type="text" 
                value={basicForm.lastName}
                onChange={(e) => setBasicForm({ ...basicForm, lastName: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        {/* Section 1: Company Information */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "#60a5fa", display: "flex", alignItems: "center", gap: "8px" }}>
            Company Information
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Company Name *</label>
              <input 
                type="text" 
                value={companyForm.companyName}
                onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Company Website (URL) *</label>
              <input 
                type="url" 
                placeholder="e.g. https://company.com" 
                value={companyForm.website}
                onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                required
              />
            </div>

            <div className="form-group form-full-width">
              <label>Company Logo</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoFileChange}
                style={{ color: "#fff" }}
              />
              {uploadingLogo && <span style={{ fontSize: "0.8rem", color: "#60a5fa", marginTop: "4px" }}>Uploading logo...</span>}
            </div>

            <div className="form-group form-full-width">
              <label>Company Description</label>
              <textarea 
                placeholder="Describe your company, its story, and main lines of work..." 
                value={companyForm.description}
                onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Company Details */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "#60a5fa", display: "flex", alignItems: "center", gap: "8px" }}>
            Company Details
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Founded Year</label>
              <input 
                type="number" 
                placeholder="e.g. 2006" 
                value={companyForm.foundedYear}
                onChange={(e) => setCompanyForm({ ...companyForm, foundedYear: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Industry</label>
              <input 
                type="text" 
                placeholder="e.g. IT - FinTech" 
                value={companyForm.industry}
                onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Company Type</label>
              <input 
                type="text" 
                placeholder="e.g. Software Company" 
                value={companyForm.companyType}
                onChange={(e) => setCompanyForm({ ...companyForm, companyType: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Company Size (Employees)</label>
              <input 
                type="text" 
                placeholder="e.g. 200+, 51-200" 
                value={companyForm.companySize}
                onChange={(e) => setCompanyForm({ ...companyForm, companySize: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Locations */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "#60a5fa", display: "flex", alignItems: "center", gap: "8px" }}>
            Locations
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Headquarters</label>
              <input 
                type="text" 
                placeholder="e.g. Sousse, Tunisia" 
                value={companyForm.headquarters}
                onChange={(e) => setCompanyForm({ ...companyForm, headquarters: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Google Maps URL</label>
              <input 
                type="url" 
                placeholder="e.g. https://maps.google.com/?q=Sousse" 
                value={companyForm.googleMapsUrl}
                onChange={(e) => setCompanyForm({ ...companyForm, googleMapsUrl: e.target.value })}
              />
            </div>

            <div className="form-group form-full-width">
              <label>Offices</label>
              <textarea 
                placeholder="List office locations (e.g. Sousse, Paris, Dubai)" 
                value={companyForm.offices}
                onChange={(e) => setCompanyForm({ ...companyForm, offices: e.target.value })}
                style={{ minHeight: "80px" }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Mission & Vision */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "#60a5fa", display: "flex", alignItems: "center", gap: "8px" }}>
            Mission & Vision
          </h3>
          <div className="form-grid">
            <div className="form-group form-full-width">
              <label>Mission</label>
              <textarea 
                placeholder="What is your company's core mission?" 
                value={companyForm.mission}
                onChange={(e) => setCompanyForm({ ...companyForm, mission: e.target.value })}
                style={{ minHeight: "80px" }}
              />
            </div>

            <div className="form-group form-full-width">
              <label>Vision</label>
              <textarea 
                placeholder="What is your company's long-term vision?" 
                value={companyForm.vision}
                onChange={(e) => setCompanyForm({ ...companyForm, vision: e.target.value })}
                style={{ minHeight: "80px" }}
              />
            </div>

            <div className="form-group form-full-width">
              <label>Company Values</label>
              <textarea 
                placeholder="List your company's core values (e.g. Innovation, Agility, Commitment)" 
                value={companyForm.companyValues}
                onChange={(e) => setCompanyForm({ ...companyForm, companyValues: e.target.value })}
                style={{ minHeight: "80px" }}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Technologies */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "#60a5fa", display: "flex", alignItems: "center", gap: "8px" }}>
            Technologies
          </h3>
          <div className="form-grid">
            <div className="form-group form-full-width">
              <label>Technologies Used</label>
              <input 
                type="text" 
                placeholder="e.g. Java, Spring, React, Cloud, AI" 
                value={companyForm.technologies}
                onChange={(e) => setCompanyForm({ ...companyForm, technologies: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 6: Social Media */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "#60a5fa", display: "flex", alignItems: "center", gap: "8px" }}>
            Social Media
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>LinkedIn Profile URL</label>
              <input 
                type="url" 
                placeholder="https://linkedin.com/company/..." 
                value={companyForm.linkedin}
                onChange={(e) => setCompanyForm({ ...companyForm, linkedin: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Facebook Page URL</label>
              <input 
                type="url" 
                placeholder="https://facebook.com/..." 
                value={companyForm.facebook}
                onChange={(e) => setCompanyForm({ ...companyForm, facebook: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Instagram Handle URL</label>
              <input 
                type="url" 
                placeholder="https://instagram.com/..." 
                value={companyForm.instagram}
                onChange={(e) => setCompanyForm({ ...companyForm, instagram: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Twitter/X Profile URL</label>
              <input 
                type="url" 
                placeholder="https://twitter.com/..." 
                value={companyForm.twitter}
                onChange={(e) => setCompanyForm({ ...companyForm, twitter: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 7: Contact */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "32px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "#60a5fa", display: "flex", alignItems: "center", gap: "8px" }}>
            Contact
          </h3>
          <div className="form-grid">
            <div className="form-group form-full-width">
              <label>Phone Number</label>
              <input 
                type="text" 
                placeholder="e.g. +216 73 123 456" 
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions" style={{ marginBottom: "50px" }}>
          <button 
            type="submit" 
            className="primary-btn" 
            style={{ minWidth: "200px", padding: "14px 28px", fontSize: "1rem" }} 
            disabled={loading}
          >
            {loading ? "Saving Profile..." : "Save Profile Details"}
          </button>
        </div>
      </form>

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Update Failed"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />

      <AlertModal 
        isOpen={showSuccess}
        type="success"
        title="Success"
        message="Corporate profile has been updated successfully!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
