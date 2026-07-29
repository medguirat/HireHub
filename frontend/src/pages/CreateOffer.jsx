import { useState } from "react";
import { useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";

export default function CreateOffer() {
  const navigate = useNavigate();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      await recruiterService.createOffer(form);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data || "Failed to publish job offer.");
      setShowAlert(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/recruiter-dashboard/offers");
  };

  return (
    <div className="dashboard-panel">
      <h2>Create a New Job Offer</h2>
      <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: "24px" }}>
        <div className="form-group form-full-width">
          <label>Job Title *</label>
          <input 
            type="text" 
            placeholder="e.g. Senior Fullstack Developer" 
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group form-full-width">
          <label>Job Description *</label>
          <textarea 
            placeholder="Provide a detailed description of the job role, tasks, and candidate requirements..." 
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Location *</label>
          <input 
            type="text" 
            placeholder="e.g. Tunis, Tunisia (or Remote)" 
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
            Publish Offer
          </button>
        </div>
      </form>

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Publishing Failed"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />

      <AlertModal 
        isOpen={showSuccess}
        type="success"
        title="Success"
        message="Your job offer has been published successfully!"
        onClose={handleSuccessClose}
      />
    </div>
  );
}
