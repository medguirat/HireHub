import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import candidateService from "../services/candidateService";
import AlertModal from "../components/AlertModal";

export default function CandidateProfile() {
  const { user, setUser } = useOutletContext();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [form, setForm] = useState({
    bio: "",
    picture: "",
    urlLinkedin: "",
    urlGithub: "",
    urlPortfolio: "",
    skills: [],
  });

  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await candidateService.getProfile();
      setForm({
        bio: res.data.bio || "",
        picture: res.data.picture || "",
        urlLinkedin: res.data.urlLinkedin || "",
        urlGithub: res.data.urlGithub || "",
        urlPortfolio: res.data.urlPortfolio || "",
        skills: res.data.skills || [],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm({ ...form, skills: [...form.skills, trimmed] });
    }
    setSkillInput("");
  };

  const removeSkill = (skill) => {
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      await candidateService.updateProfile(form);

      const mergedUser = { ...user, firstName: user.firstName, lastName: user.lastName };
      localStorage.setItem("user", JSON.stringify(mergedUser));
      setUser(mergedUser);

      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to update profile.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const defaultPicture = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

  return (
    <div
      className="dashboard-panel"
      style={{ maxWidth: "600px", margin: "0 auto", textAlign: "left" }}
    >
      <div className="profile-hero">
  <div className="profile-avatar-ring">
    {form.picture ? (
      <img src={form.picture} alt="Profile" onError={(e) => { e.target.style.display = "none"; }} />
    ) : (
      <div className="avatar-initials">
        {`${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "?"}
      </div>
    )}
  </div>
  <div className="profile-hero-info">
    <h2>{user?.firstName} {user?.lastName}</h2>
    <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{user?.email}</span>
    <div className="profile-hero-stats">
      <div className="profile-hero-stat">
        <span className="value">{form.skills.length}</span>
        <span className="label">Skills</span>
      </div>
    </div>
  </div>
</div>

      <form onSubmit={handleSubmit} className="form-grid">
        <h3 className="form-full-width" style={{ fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", margin: "10px 0 0 0" }}>
          About You
        </h3>

        <div className="form-group form-full-width">
          <label>Bio</label>
          <textarea
            placeholder="Tell recruiters about yourself..."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>

        <div className="form-group form-full-width">
          <label>Profile Picture URL</label>
          <input
            type="text"
            placeholder="e.g. https://.../photo.png"
            value={form.picture}
            onChange={(e) => setForm({ ...form, picture: e.target.value })}
          />
        </div>

        <h3 className="form-full-width" style={{ fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", margin: "20px 0 0 0" }}>
          Links
        </h3>

        <div className="form-group">
          <label>LinkedIn URL</label>
          <input
            type="text"
            value={form.urlLinkedin}
            onChange={(e) => setForm({ ...form, urlLinkedin: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>GitHub URL</label>
          <input
            type="text"
            value={form.urlGithub}
            onChange={(e) => setForm({ ...form, urlGithub: e.target.value })}
          />
        </div>

        <div className="form-group form-full-width">
          <label>Portfolio URL</label>
          <input
            type="text"
            value={form.urlPortfolio}
            onChange={(e) => setForm({ ...form, urlPortfolio: e.target.value })}
          />
        </div>

        <h3 className="form-full-width" style={{ fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", margin: "20px 0 0 0" }}>
          Skills
        </h3>

        <div className="form-group form-full-width">
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="e.g. React"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            />
            <button type="button" className="secondary-btn" onClick={addSkill}>
              Add
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
            {form.skills.map((skill) => (
              <span
                key={skill}
                style={{
                  background: "rgba(59,130,246,0.15)",
                  color: "#3b82f6",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {skill}
                <span style={{ cursor: "pointer" }} onClick={() => removeSkill(skill)}>✕</span>
              </span>
            ))}
          </div>
        </div>

        <div className="form-actions form-full-width">
          <button type="submit" className="primary-btn" style={{ width: "100%", padding: "12px" }} disabled={loading}>
            {loading ? "Saving Profile..." : "Save Profile"}
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
        message="Your profile has been updated successfully!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}