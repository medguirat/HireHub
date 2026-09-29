import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import candidateService from "../services/candidateService";
import aiService from "../services/aiService";
import AlertModal from "../components/AlertModal";
import { useToast } from "../components/Toast";

export default function CandidateProfile() {
  const { user, setUser } = useOutletContext();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const toast = useToast();

  // States for forms
  const [basicForm, setBasicForm] = useState({
    firstName: "",
    lastName: ""
  });

  const [profileForm, setProfileForm] = useState({
    urlLinkedin: "",
    urlGithub: "",
    urlPortfolio: "",
    bio: "",
    picture: ""
  });

  const [skills, setSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);

  // Form states for adding new skill / experience
  const [skillInput, setSkillInput] = useState("");
  const [newExp, setNewExp] = useState({
    position: "",
    company: "",
    startDate: "",
    endDate: ""
  });

  const [uploadingPic, setUploadingPic] = useState(false);

  // AI Profile Assistant state
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [aiInputText, setAiInputText] = useState("");
  const [aiTargetRole, setAiTargetRole] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiGenResult, setAiGenResult] = useState(null);

  // Load profile from the backend on mount
  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const profile = await candidateService.getProfile();
        if (active) {
          setProfileForm({
            urlLinkedin: profile.urlLinkedin || "",
            urlGithub: profile.urlGithub || "",
            urlPortfolio: profile.urlPortfolio || "",
            bio: profile.bio || "",
            picture: profile.picture || ""
          });

          setBasicForm({
            firstName: profile.firstName || "",
            lastName: profile.lastName || ""
          });

          setSkills(profile.skills || []);
          setExperiences(profile.experiences || []);

          // Sync with layout context
          setUser(prev => ({
            ...prev,
            firstName: profile.firstName || prev?.firstName,
            lastName: profile.lastName || prev?.lastName,
            candidateProfile: profile
          }));
        }
      } catch (err) {
        console.error("Failed to load candidate profile:", err);
        setErrorMsg("Failed to load candidate profile information.");
        setShowAlert(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProfile();
    return () => { active = false; };
  }, [setUser]);

  // Profile Completeness Calculation
  const calculateCompleteness = () => {
    let score = 0;
    if (basicForm.firstName && basicForm.lastName) score += 20;
    if (profileForm.picture) score += 15;
    if (profileForm.bio && profileForm.bio.length > 20) score += 20;
    if (skills.length >= 1) score += 15;
    if (skills.length >= 3) score += 10;
    if (experiences.length >= 1) score += 10;
    if (profileForm.urlLinkedin || profileForm.urlGithub || profileForm.urlPortfolio) score += 10;
    return Math.min(100, score);
  };

  const completenessScore = calculateCompleteness();

  const getBadgeInfo = (score) => {
    if (score >= 90) return { label: "⭐ All-Star Profile", color: "var(--green)", bg: "rgba(var(--green-rgb), 0.15)", border: "rgba(var(--green-rgb), 0.4)" };
    if (score >= 75) return { label: "🥇 Strong Profile", color: "var(--cyan)", bg: "rgba(var(--cyan-rgb), 0.15)", border: "rgba(var(--cyan-rgb), 0.4)" };
    if (score >= 50) return { label: "🥈 Intermediate Profile", color: "var(--orange)", bg: "rgba(var(--orange-rgb), 0.15)", border: "rgba(var(--orange-rgb), 0.4)" };
    return { label: "🥉 Basic Profile", color: "var(--text-muted)", bg: "rgba(var(--text-muted-rgb), 0.15)", border: "rgba(var(--text-muted-rgb), 0.4)" };
  };

  const badgeInfo = getBadgeInfo(completenessScore);

  const handleGenerateAiProfile = async () => {
    setGeneratingAi(true);
    setAiGenResult(null);
    try {
      const res = await aiService.generateBio(
        aiTargetRole || (experiences.length > 0 ? experiences[0].position : "Software Engineer"),
        skills,
        aiInputText
      );
      setAiGenResult(res);
    } catch (err) {
      console.error("AI Bio Generation Error:", err);
      setErrorMsg("Failed to generate AI profile summary.");
      setShowAlert(true);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleApplyAiResult = () => {
    if (!aiGenResult) return;
    if (aiGenResult.generated_bio) {
      setProfileForm(prev => ({ ...prev, bio: aiGenResult.generated_bio }));
    }
    if (aiGenResult.extracted_skills && aiGenResult.extracted_skills.length > 0) {
      const combined = Array.from(new Set([...skills, ...aiGenResult.extracted_skills]));
      setSkills(combined);
    }
    setShowAiAssistantModal(false);
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const cleanSkill = skillInput.trim();
    if (cleanSkill && !skills.includes(cleanSkill)) {
      setSkills([...skills, cleanSkill]);
    }
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleAddExperience = (e) => {
    e.preventDefault();
    if (!newExp.position.trim() || !newExp.company.trim() || !newExp.startDate) {
      setErrorMsg("Position, Company, and Start Date are required to add an experience.");
      setShowAlert(true);
      return;
    }

    setExperiences([...experiences, { ...newExp }]);
    setNewExp({
      position: "",
      company: "",
      startDate: "",
      endDate: ""
    });
  };

  const handleRemoveExperience = (index) => {
    setExperiences(experiences.filter((_, idx) => idx !== index));
  };

  const handlePictureFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPic(true);
    try {
      const uploadRes = await candidateService.uploadFile(file);
      setProfileForm({ ...profileForm, picture: uploadRes.url });
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to upload profile picture.");
      setShowAlert(true);
    } finally {
      setUploadingPic(false);
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

      const formattedLinkedin = formatUrl(profileForm.urlLinkedin);
      const formattedGithub = formatUrl(profileForm.urlGithub);
      const formattedPortfolio = formatUrl(profileForm.urlPortfolio);

      const updatedUser = await candidateService.updateBasicInfo({
        firstName: basicForm.firstName,
        lastName: basicForm.lastName
      });

      const updatedProfile = await candidateService.updateProfile({
        urlLinkedin: formattedLinkedin,
        urlGithub: formattedGithub,
        urlPortfolio: formattedPortfolio,
        bio: profileForm.bio,
        picture: profileForm.picture,
        skills: skills,
        experiences: experiences.map(exp => ({
          position: exp.position,
          company: exp.company,
          startDate: exp.startDate,
          endDate: exp.endDate || null
        }))
      });

      setUser(prev => ({
        ...prev,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        candidateProfile: updatedProfile
      }));

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const updatedStored = {
          ...parsed,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
        };
        localStorage.setItem("user", JSON.stringify(updatedStored));
      }

      toast("Your profile is saved.");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || 
        err.response?.data || 
        "Failed to update profile. Please verify your inputs."
      );
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60";

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", textAlign: "left" }}>
      {/* Top Profile Summary Card with AI Assistant Trigger & Completeness Gauge */}
      <div 
        className="dashboard-panel" 
        style={{ 
          marginBottom: "32px",
          padding: "28px",
          position: "relative",
          background: "linear-gradient(135deg, rgba(var(--bg-rgb), 0.9), rgba(var(--surface-raised-rgb), 0.9))",
          border: "1px solid rgba(var(--cyan-rgb), 0.2)",
          boxShadow: "0 12px 32px rgba(var(--black-rgb), 0.3)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <img 
              src={profileForm.picture || defaultAvatar} 
              alt="Profile Preview" 
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                objectFit: "cover",
                backgroundColor: "rgba(var(--white-rgb), 0.05)",
                border: "3px solid var(--cyan)",
                padding: "3px",
                boxShadow: "0 8px 24px rgba(var(--cyan-rgb), 0.25)"
              }}
              onError={(e) => { e.target.src = defaultAvatar; }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "700", color: "var(--white)" }}>
                {basicForm.firstName} {basicForm.lastName}
              </h2>
              <span style={{
                backgroundColor: badgeInfo.bg,
                color: badgeInfo.color,
                border: `1px solid ${badgeInfo.border}`,
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: "600"
              }}>
                {badgeInfo.label}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "0.92rem", color: "var(--text-secondary)", marginTop: "8px" }}>
              <span>✉️ {user?.email}</span>
              {skills.length > 0 && <span>⚡ {skills.length} Skills Listed</span>}
              {experiences.length > 0 && <span>💼 {experiences.length} Experiences</span>}
            </div>
          </div>

          <div>
            <button 
              type="button"
              className="primary-btn"
              onClick={() => setShowAiAssistantModal(true)}
              style={{
                background: "linear-gradient(135deg, var(--violet), var(--violet))",
                boxShadow: "0 4px 15px rgba(var(--violet-rgb), 0.4)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "600",
                padding: "10px 18px",
                fontSize: "0.9rem"
              }}
            >
              <span>✨ AI Profile & Skill Enhancer</span>
            </button>
          </div>
        </div>

        {/* Profile Completeness Bar */}
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(var(--white-rgb), 0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "8px" }}>
            <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Profile Completeness Meter</span>
            <span style={{ color: badgeInfo.color, fontWeight: "700" }}>{completenessScore}% Complete</span>
          </div>
          <div style={{ height: "8px", width: "100%", backgroundColor: "rgba(var(--white-rgb), 0.1)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${completenessScore}%`,
              background: "linear-gradient(90deg, var(--cyan), var(--violet), var(--magenta))",
              borderRadius: "4px",
              transition: "width 0.6s ease-in-out"
            }} />
          </div>
          {completenessScore < 100 && (
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
              💡 Tip: {completenessScore < 50 ? "Add your skills and bio to boost candidate visibility." : completenessScore < 80 ? "Add professional links (LinkedIn/GitHub) & experience to reach All-Star status." : "Complete any missing fields for 100% maximum recruiter appeal."}
            </div>
          )}
        </div>
      </div>


      <form onSubmit={handleSaveProfile}>
        {/* Personal Details Section */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "var(--cyan)" }}>
            Personal Details
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

        {/* Bio Section */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "var(--cyan)" }}>
            Professional Bio
          </h3>
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label>Profile Picture</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handlePictureFileChange}
              style={{ color: "var(--white)" }}
            />
            {uploadingPic && <span style={{ fontSize: "0.8rem", color: "var(--cyan)", marginTop: "4px" }}>Uploading image...</span>}
          </div>
          <div className="form-group">
            <label>Bio (Introduce yourself to recruiters) *</label>
            <textarea 
              rows="6" 
              maxLength="2000"
              placeholder="Brief professional summary..."
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Social Links Section */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "var(--cyan)" }}>
            Professional Links
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>LinkedIn Profile URL</label>
              <input 
                type="text" 
                placeholder="linkedin.com/in/username" 
                value={profileForm.urlLinkedin}
                onChange={(e) => setProfileForm({ ...profileForm, urlLinkedin: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>GitHub Profile URL</label>
              <input 
                type="text" 
                placeholder="github.com/username" 
                value={profileForm.urlGithub}
                onChange={(e) => setProfileForm({ ...profileForm, urlGithub: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Portfolio Website URL</label>
              <input 
                type="text" 
                placeholder="myportfolio.dev" 
                value={profileForm.urlPortfolio}
                onChange={(e) => setProfileForm({ ...profileForm, urlPortfolio: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "var(--cyan)" }}>
            Skills
          </h3>
          <div className="skills-input-row">
            <input 
              type="text" 
              placeholder="e.g. React, Java, UI/UX" 
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              style={{ flex: 1, backgroundColor: "rgba(var(--black-rgb), 0.2)", border: "1px solid var(--border-color)", color: "var(--white)", padding: "10px", borderRadius: "8px", outline: "none" }}
              onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddSkill(e); } }}
            />
            <button type="button" className="secondary-btn" onClick={handleAddSkill} style={{ height: "42px" }}>
              Add Skill
            </button>
          </div>

          <div className="skills-tags-container">
            {skills.map((skill, index) => (
              <span key={index} className="skill-tag">
                {skill}
                <button type="button" className="remove-tag-btn" onClick={() => handleRemoveSkill(skill)}>×</button>
              </span>
            ))}
            {skills.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", marginTop: "8px" }}>
                No skills added yet. Add some to get noticed!
              </div>
            )}
          </div>
        </div>

        {/* Experiences Section */}
        <div className="dashboard-panel" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.15rem", fontWeight: "600", color: "var(--cyan)" }}>
            Professional Experience
          </h3>
          
          {/* New Experience Inline Form */}
          <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "20px", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 14px 0", fontSize: "0.95rem", color: "var(--text-muted)" }}>Add Professional Experience</h4>
            <div className="experience-form-row">
              <div className="form-group">
                <label>Job Position *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Frontend Engineer" 
                  value={newExp.position}
                  onChange={(e) => setNewExp({ ...newExp, position: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Company *</label>
                <input 
                  type="text" 
                  placeholder="e.g. TechCorp" 
                  value={newExp.company}
                  onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                />
              </div>
            </div>
            
            <div className="experience-form-row" style={{ marginTop: "12px" }}>
              <div className="form-group">
                <label>Start Date *</label>
                <input 
                  type="date" 
                  value={newExp.startDate}
                  onChange={(e) => setNewExp({ ...newExp, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date (Leave blank if current)</label>
                <input 
                  type="date" 
                  value={newExp.endDate}
                  onChange={(e) => setNewExp({ ...newExp, endDate: e.target.value })}
                />
              </div>
            </div>
            
            <button type="button" className="secondary-btn" onClick={handleAddExperience} style={{ marginTop: "16px" }}>
              Add Experience
            </button>
          </div>

          {/* Experience list */}
          <div className="experience-list">
            {experiences.map((exp, index) => (
              <div key={index} className="experience-item-card">
                <div className="experience-details">
                  <h4>{exp.position}</h4>
                  <p>Company: {exp.company}</p>
                  <div className="experience-dates">
                    Duration: {exp.startDate} to {exp.endDate || "Present"}
                  </div>
                </div>
                <button 
                  type="button" 
                  className="action-btn-small btn-reject" 
                  onClick={() => handleRemoveExperience(index)}
                  style={{ padding: "4px 8px" }}
                >
                  Remove
                </button>
              </div>
            ))}
            {experiences.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                No experience listed. Add one to show recruiters your work history.
              </div>
            )}
          </div>
        </div>

        {/* Action Button Row */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginBottom: "40px" }}>
          <button 
            type="submit" 
            className="primary-btn" 
            disabled={loading}
            style={{ padding: "12px 28px" }}
          >
            {loading ? "Saving Changes..." : "Save Profile Details"}
          </button>
        </div>
      </form>

      {/* AI Profile Enhancer & Skill Extractor Modal */}
      {showAiAssistantModal && (
        <div className="modal-overlay" style={{ backdropFilter: "blur(8px)" }}>
          <div className="modal-content" style={{ maxWidth: "650px", width: "90%", borderRadius: "20px", border: "1px solid rgba(var(--violet-rgb), 0.4)" }}>
            <div className="modal-header" style={{ borderBottom: "1px solid rgba(var(--white-rgb), 0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.5rem" }}>✨</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.25rem" }}>AI Candidate Profile Generator</h2>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "var(--violet-soft)" }}>
                    Automatically extract technical skills & generate a compelling bio summary
                  </p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowAiAssistantModal(false)}>×</button>
            </div>

            <div className="modal-body" style={{ padding: "20px 0" }}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label>Target Job Title / Specialization</label>
                <input 
                  type="text" 
                  placeholder="e.g. Full Stack Developer, Data Analyst..." 
                  value={aiTargetRole}
                  onChange={(e) => setAiTargetRole(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Paste your CV text, project notes, or skills list</label>
                <textarea 
                  rows="5"
                  placeholder="Paste text from your CV/Resume here... e.g. Experienced in Java, Spring Boot, React, SQL, Docker..."
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                />
              </div>

              <button 
                type="button" 
                className="primary-btn" 
                onClick={handleGenerateAiProfile}
                disabled={generatingAi}
                style={{ width: "100%", background: "linear-gradient(135deg, var(--violet), var(--violet))", padding: "12px" }}
              >
                {generatingAi ? "Generating Profile Summary..." : "✨ Extract Skills & Generate Bio"}
              </button>

              {aiGenResult && (
                <div style={{ marginTop: "20px", background: "rgba(var(--white-rgb), 0.03)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(var(--violet-rgb), 0.3)" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "var(--violet-soft)", fontSize: "0.95rem" }}>Generated Professional Bio:</h4>
                  <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", lineHeight: "1.5", margin: "0 0 14px 0" }}>
                    "{aiGenResult.generated_bio}"
                  </p>

                  {aiGenResult.extracted_skills && aiGenResult.extracted_skills.length > 0 && (
                    <div>
                      <h5 style={{ margin: "0 0 8px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>Extracted Skills:</h5>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {aiGenResult.extracted_skills.map((s, i) => (
                          <span key={i} style={{ backgroundColor: "rgba(var(--violet-rgb), 0.2)", color: "var(--violet-soft)", padding: "2px 8px", borderRadius: "12px", fontSize: "0.78rem" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: "1px solid rgba(var(--white-rgb), 0.08)", paddingTop: "14px", display: "flex", justifyContent: "space-between" }}>
              <button className="secondary-btn" onClick={() => setShowAiAssistantModal(false)}>
                Cancel
              </button>
              {aiGenResult && (
                <button className="primary-btn" onClick={handleApplyAiResult} style={{ backgroundColor: "var(--green)" }}>
                  Apply to Profile Form
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Profile Update Failed"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />

    </div>
  );
}

