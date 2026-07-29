import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import recruiterService from "../services/recruiterService";
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
    location: "",
    // Extended fields (stored locally)
    phone: "",
    sector: "",
    companySize: "11-50"
  });

  // Populate form with current user info
  useEffect(() => {
    if (user) {
      setBasicForm({
        firstName: user.firstName || "",
        lastName: user.lastName || ""
      });

      const profile = user.recruiterProfile || {};
      
      // Fetch local storage extra fields for persistence of unmapped database columns
      const localExtra = localStorage.getItem(`recruiter_profile_extra_${user.id}`);
      const parsedExtra = localExtra ? JSON.parse(localExtra) : {};

      setCompanyForm({
        companyName: profile.companyName || "",
        website: profile.website || "",
        logo: profile.logo || "",
        location: profile.location || "",
        phone: parsedExtra.phone || "",
        sector: parsedExtra.sector || "",
        companySize: parsedExtra.companySize || "11-50"
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // Validate website URL format if provided
      let formattedWebsite = companyForm.website.trim();
      if (formattedWebsite && !/^https?:\/\//i.test(formattedWebsite)) {
        formattedWebsite = `https://${formattedWebsite}`;
      }

      // 1. Update basic user info
      const updatedUser = await recruiterService.updateBasicInfo({
        firstName: basicForm.firstName,
        lastName: basicForm.lastName
      });

      // 2. Update company profile on backend
      const updatedProfile = await recruiterService.updateProfile({
        companyName: companyForm.companyName,
        website: formattedWebsite,
        logo: companyForm.logo,
        location: companyForm.location
      });

      // 3. Save local extra fields to localStorage
      const extraData = {
        phone: companyForm.phone,
        sector: companyForm.sector,
        companySize: companyForm.companySize
      };
      localStorage.setItem(`recruiter_profile_extra_${user.id}`, JSON.stringify(extraData));

      // Merge and save to localStorage
      const mergedUser = {
        ...user,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        recruiterProfile: {
          ...user.recruiterProfile,
          companyName: updatedProfile.companyName,
          website: updatedProfile.website,
          logo: updatedProfile.logo,
          location: updatedProfile.location
        }
      };

      localStorage.setItem("user", JSON.stringify(mergedUser));
      setUser(mergedUser); // Update context
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || 
        err.response?.data || 
        "Failed to update profile. Make sure the website URL is valid."
      );
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const defaultLogo = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3";

  return (
    <div 
      className="dashboard-panel" 
      style={{ 
        maxWidth: "600px", 
        margin: "0 auto", 
        textAlign: "left"
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "30px", position: "relative" }}>
        <div style={{ display: "inline-block", position: "relative" }}>
          <img 
            src={companyForm.logo || defaultLogo} 
            alt="Company Logo Preview" 
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              objectFit: "cover",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "3px solid #3b82f6",
              padding: "4px",
              boxShadow: "0 8px 24px rgba(59, 130, 246, 0.25)"
            }}
            onError={(e) => { e.target.src = defaultLogo; }}
          />
        </div>
        <h2 style={{ margin: "16px 0 6px 0", fontSize: "1.5rem" }}>
          {companyForm.companyName || "Your Company Profile"}
        </h2>
        <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          📍 {companyForm.location || "Location not configured"}
        </span>
      </div>

      <form onSubmit={handleSaveProfile} className="form-grid">
        <h3 className="form-full-width" style={{ fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", margin: "10px 0 0 0" }}>
          Corporate Representative
        </h3>
        
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

        <h3 className="form-full-width" style={{ fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", margin: "20px 0 0 0" }}>
          Enterprise Credentials
        </h3>

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
            type="text" 
            placeholder="e.g. https://company.com" 
            value={companyForm.website}
            onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Office Location</label>
          <input 
            type="text" 
            placeholder="e.g. Tunis, Tunisia" 
            value={companyForm.location}
            onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Logo Image URL</label>
          <input 
            type="text" 
            placeholder="e.g. https://company.com/logo.png" 
            value={companyForm.logo}
            onChange={(e) => setCompanyForm({ ...companyForm, logo: e.target.value })}
          />
        </div>

        {/* Extra Fields */}
        <div className="form-group">
          <label>Contact Phone</label>
          <input 
            type="text" 
            placeholder="e.g. +216 22 123 456" 
            value={companyForm.phone}
            onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Industry Sector</label>
          <input 
            type="text" 
            placeholder="e.g. IT & Software Development" 
            value={companyForm.sector}
            onChange={(e) => setCompanyForm({ ...companyForm, sector: e.target.value })}
          />
        </div>

        <div className="form-group form-full-width">
          <label>Company Size (Employees)</label>
          <select 
            value={companyForm.companySize}
            onChange={(e) => setCompanyForm({ ...companyForm, companySize: e.target.value })}
          >
            <option value="1-10">1-10 employees</option>
            <option value="11-50">11-50 employees</option>
            <option value="51-200">51-200 employees</option>
            <option value="200+">200+ employees</option>
          </select>
        </div>

        <div className="form-actions form-full-width">
          <button type="submit" className="primary-btn" style={{ width: "100%", padding: "12px" }} disabled={loading}>
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
