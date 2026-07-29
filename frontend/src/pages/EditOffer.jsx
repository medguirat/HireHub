import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";

export default function EditOffer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    contractType: "CDI",
    deadline: ""
  });

  useEffect(() => {
    loadOffer();
  }, [id]);

  const loadOffer = async () => {
    setLoading(true);
    try {
      const data = await recruiterService.getOfferById(id);
      setForm({
        title: data.title || "",
        description: data.description || "",
        location: data.location || "",
        contractType: data.contractType || "CDI",
        deadline: data.deadline || ""
      });
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load job offer details.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      await recruiterService.updateOffer(id, form);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to update job offer.");
      setShowAlert(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/recruiter-dashboard/offers");
  };

  return (
    <div className="dashboard-panel">
      <h2>Edit Job Offer</h2>
      {loading ? (
        <div className="loading-container">
          <div>Loading job offer details...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: "24px" }}>
          <div className="form-group form-full-width">
            <label>Job Title *</label>
            <input 
              type="text" 
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group form-full-width">
            <label>Job Description *</label>
            <textarea 
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input 
              type="text" 
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Contract Type *</label>
            <select 
              value={form.contractType}
              onChange={(e) => setForm({ ...form, contractType: e.target.value })}
              required
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">Stage (Internship)</option>
              <option value="FREELANCE">Freelance</option>
            </select>
          </div>

          <div className="form-group">
            <label>Application Deadline *</label>
            <input 
              type="date" 
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              required
            />
          </div>

          <div className="form-actions form-full-width">
            <button type="button" className="secondary-btn" onClick={() => navigate("/recruiter-dashboard/offers")}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Save Changes
            </button>
          </div>
        </form>
      )}

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Operation Failed"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />

      <AlertModal 
        isOpen={showSuccess}
        type="success"
        title="Success"
        message="Your changes have been saved successfully!"
        onClose={handleSuccessClose}
      />
    </div>
  );
}
