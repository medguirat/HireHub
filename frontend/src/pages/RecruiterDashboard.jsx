import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import recruiterService from "../services/recruiterService";
import Sidebar from "../components/Sidebar";
import "../styles/recruiterDashboard.css";

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);
  
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newOffer, setNewOffer] = useState({
    title: "",
    description: "",
    location: "",
    contractType: "CDI",
    deadline: ""
  });
  
  const [editingOffer, setEditingOffer] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "RECRUITER") {
      navigate("/login"); 
      return;
    }
    
    setUser(parsedUser);
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const offersData = await recruiterService.getOffers(0, 50);
      const appsData = await recruiterService.getApplications(0, 100);
      
      setOffers(offersData.content || []);
      setApplications(appsData.content || []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  
  const handleCreateOffer = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await recruiterService.createOffer(newOffer);
      setNewOffer({
        title: "",
        description: "",
        location: "",
        contractType: "CDI",
        deadline: ""
      });
      setActiveTab("offers");
      loadDashboardData();
    } catch (err) {
      console.error("Error creating job offer:", err);
      setError(err.response?.data?.message || "Failed to create job offer.");
    }
  };

  const handleEditClick = (offer) => {
    setEditingOffer({
      id: offer.id,
      title: offer.title,
      description: offer.description,
      location: offer.location,
      contractType: offer.contractType || "CDI",
      deadline: offer.deadline || ""
    });
    setActiveTab("edit-offer");
  };

  const handleUpdateOffer = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await recruiterService.updateOffer(editingOffer.id, {
        title: editingOffer.title,
        description: editingOffer.description,
        location: editingOffer.location,
        contractType: editingOffer.contractType,
        deadline: editingOffer.deadline
      });
      setEditingOffer(null);
      setActiveTab("offers");
      loadDashboardData();
    } catch (err) {
      console.error("Error updating job offer:", err);
      setError(err.response?.data?.message || "Failed to update job offer.");
    }
  };

 
  const handleDeleteOffer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job offer?")) return;
    setError("");
    try {
      await recruiterService.deleteOffer(id);
      loadDashboardData();
    } catch (err) {
      console.error("Error deleting job offer:", err);
      setError(err.response?.data?.message || "Failed to delete job offer.");
    }
  };

  // Update Application Status Handler
  const handleStatusChange = async (id, status) => {
    setError("");
    try {
      await recruiterService.updateApplicationStatus(id, status);
      loadDashboardData();
    } catch (err) {
      console.error("Error updating application status:", err);
      setError(err.response?.data?.message || "Failed to update application status.");
    }
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  // Statistics calculations
  const totalOffers = offers.length;
  const totalApplications = applications.length;
  const pendingApps = applications.filter((app) => app.status === "PENDING").length;
  const acceptedApps = applications.filter((app) => app.status === "ACCEPTED").length;
  const rejectedApps = applications.filter((app) => app.status === "REJECTED").length;

  // OVERVIEW TAB RENDERER
  const renderOverview = () => (
    <div>
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-title">Total Job Offers</div>
          <div className="stat-value">{totalOffers}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-title">Applications Received</div>
          <div className="stat-value">{totalApplications}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-title">Pending Review</div>
          <div className="stat-value">{pendingApps}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-title">Accepted Candidates</div>
          <div className="stat-value">{acceptedApps}</div>
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="panel-header">
          <h2>Recent Applications</h2>
          <button className="secondary-btn" onClick={() => setActiveTab("applications")}>
            View All
          </button>
        </div>

        {applications.length === 0 ? (
          <div className="empty-state">No applications received yet.</div>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job Title</th>
                  <th>CV</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 5).map((app) => (
                  <tr key={app.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{app.candidateName} {app.candidateLastName}</span>
                    </td>
                    <td>{app.jobOfferTitle}</td>
                    <td>
                      {app.cv ? (
                        <a href={app.cv} target="_blank" rel="noreferrer" className="cv-link">
                          View CV 📄
                        </a>
                      ) : (
                        "No CV attached"
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${app.status.toLowerCase()}`}>
                        {app.status}
                      </span>
                    </td>
                    <td>
                      {app.status === "PENDING" ? (
                        <div className="action-row">
                          <button 
                            className="action-btn-small btn-approve"
                            onClick={() => handleStatusChange(app.id, "ACCEPTED")}
                          >
                            Accept
                          </button>
                          <button 
                            className="action-btn-small btn-reject"
                            onClick={() => handleStatusChange(app.id, "REJECTED")}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // OFFERS TAB RENDERER
  const renderOffers = () => (
    <div>
      <div className="panel-header" style={{ marginBottom: "24px" }}>
        <h2>Active Job Openings ({totalOffers})</h2>
        <button className="primary-btn" onClick={() => setActiveTab("create-offer")}>
          + Create New Offer
        </button>
      </div>

      {offers.length === 0 ? (
        <div className="empty-state">
          You haven't posted any job offers yet. Create your first offer to attract talent!
        </div>
      ) : (
        <div className="offers-grid">
          {offers.map((offer) => (
            <div key={offer.id} className="offer-card">
              <div className="offer-card-header">
                <h3>{offer.title}</h3>
                <span className={`contract-badge badge-${(offer.contractType || 'cdi').toLowerCase()}`}>
                  {offer.contractType || "CDI"}
                </span>
              </div>
              <p className="offer-desc">{offer.description}</p>
              <div className="offer-meta-info">
                <div className="meta-item">
                  <span>📍</span> {offer.location}
                </div>
                <div className="meta-item">
                  <span>⏰</span> Deadline: {formatDate(offer.deadline)}
                </div>
              </div>
              <div className="offer-actions">
                <button className="btn-edit" onClick={() => handleEditClick(offer)}>
                  Edit
                </button>
                <button className="btn-delete" onClick={() => handleDeleteOffer(offer.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // APPLICATIONS TAB RENDERER
  const renderApplications = () => (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h2>Candidates Applications ({totalApplications})</h2>
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">No candidates have applied to your offers yet.</div>
      ) : (
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job Position</th>
                <th>CV</th>
                <th>Cover Letter</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{app.candidateName} {app.candidateLastName}</span>
                  </td>
                  <td>{app.jobOfferTitle}</td>
                  <td>
                    {app.cv ? (
                      <a href={app.cv} target="_blank" rel="noreferrer" className="cv-link">
                        Open Document 📄
                      </a>
                    ) : (
                      "No CV"
                    )}
                  </td>
                  <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={app.coverLetter}>
                    {app.coverLetter || "No cover letter"}
                  </td>
                  <td>
                    <span className={`status-badge status-${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>
                    {app.status === "PENDING" ? (
                      <div className="action-row">
                        <button 
                          className="action-btn-small btn-approve"
                          onClick={() => handleStatusChange(app.id, "ACCEPTED")}
                        >
                          Accept
                        </button>
                        <button 
                          className="action-btn-small btn-reject"
                          onClick={() => handleStatusChange(app.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        Processed ({app.status === "ACCEPTED" ? "Accepted" : "Rejected"})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // RECRUITER PROFILE RENDERER
  const renderProfile = () => {
    const recruiterProfile = user?.recruiterProfile || {};
    return (
      <div className="dashboard-panel" style={{ maxWidth: "600px" }}>
        <h2>Company & Recruiter Profile</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          This information is displayed to candidates on your job offers.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "600" }}>FULL NAME</label>
            <div style={{ padding: "10px 0", fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)" }}>
              {user?.firstName} {user?.lastName}
            </div>
          </div>
          <div>
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "600" }}>EMAIL ADDRESS</label>
            <div style={{ padding: "10px 0", fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)" }}>
              {user?.email}
            </div>
          </div>
          <div>
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "600" }}>COMPANY NAME</label>
            <div style={{ padding: "10px 0", fontSize: "1.1rem", borderBottom: "1px solid var(--border-color)" }}>
              {recruiterProfile.companyName || "Not configured yet"}
            </div>
          </div>
          <div>
            <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "600" }}>BIO / COMPANY DESCRIPTION</label>
            <div style={{ padding: "10px 0", fontSize: "1.0rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {recruiterProfile.bio || "No description provided."}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // CREATE JOB OFFER TAB RENDERER
  const renderCreateOffer = () => (
    <div className="dashboard-panel">
      <h2>Create a New Job Offer</h2>
      <form onSubmit={handleCreateOffer} className="form-grid" style={{ marginTop: "24px" }}>
        <div className="form-group form-full-width">
          <label>Job Title *</label>
          <input 
            type="text" 
            placeholder="e.g. Senior Fullstack Developer" 
            value={newOffer.title}
            onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group form-full-width">
          <label>Job Description *</label>
          <textarea 
            placeholder="Provide a detailed description of the job role, tasks, and candidate requirements..." 
            value={newOffer.description}
            onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Location *</label>
          <input 
            type="text" 
            placeholder="e.g. Tunis, Tunisia (or Remote)" 
            value={newOffer.location}
            onChange={(e) => setNewOffer({ ...newOffer, location: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Contract Type *</label>
          <select 
            value={newOffer.contractType}
            onChange={(e) => setNewOffer({ ...newOffer, contractType: e.target.value })}
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
            value={newOffer.deadline}
            onChange={(e) => setNewOffer({ ...newOffer, deadline: e.target.value })}
            required
          />
        </div>

        <div className="form-actions form-full-width">
          <button type="button" className="secondary-btn" onClick={() => setActiveTab("offers")}>
            Cancel
          </button>
          <button type="submit" className="primary-btn">
            Publish Offer
          </button>
        </div>
      </form>
    </div>
  );

  // EDIT JOB OFFER TAB RENDERER
  const renderEditOffer = () => (
    <div className="dashboard-panel">
      <h2>Edit Job Offer</h2>
      {editingOffer && (
        <form onSubmit={handleUpdateOffer} className="form-grid" style={{ marginTop: "24px" }}>
          <div className="form-group form-full-width">
            <label>Job Title *</label>
            <input 
              type="text" 
              value={editingOffer.title}
              onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group form-full-width">
            <label>Job Description *</label>
            <textarea 
              value={editingOffer.description}
              onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input 
              type="text" 
              value={editingOffer.location}
              onChange={(e) => setEditingOffer({ ...editingOffer, location: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Contract Type *</label>
            <select 
              value={editingOffer.contractType}
              onChange={(e) => setEditingOffer({ ...editingOffer, contractType: e.target.value })}
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
              value={editingOffer.deadline}
              onChange={(e) => setEditingOffer({ ...editingOffer, deadline: e.target.value })}
              required
            />
          </div>

          <div className="form-actions form-full-width">
            <button 
              type="button" 
              className="secondary-btn" 
              onClick={() => {
                setEditingOffer(null);
                setActiveTab("offers");
              }}
            >
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Save Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <div className="recruiter-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="recruiter-content">
        <div className="content-header">
          <div>
            <h1>Dashboard</h1>
            <p style={{ color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
              Welcome back, {user?.firstName || "Recruiter"}
            </p>
          </div>
          <div className="user-badge">
            🏢 Recruiter Corporate Account
          </div>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: "rgba(239, 68, 68, 0.1)", 
            color: "#f87171", 
            padding: "12px 20px", 
            borderRadius: "8px", 
            border: "1px solid rgba(239, 68, 68, 0.2)",
            marginBottom: "24px"
          }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div>Loading dashboard resources...</div>
          </div>
        ) : (
          <>
            {activeTab === "overview" && renderOverview()}
            {activeTab === "offers" && renderOffers()}
            {activeTab === "applications" && renderApplications()}
            {activeTab === "profile" && renderProfile()}
            {activeTab === "create-offer" && renderCreateOffer()}
            {activeTab === "edit-offer" && renderEditOffer()}
          </>
        )}
      </div>
    </div>
  );
}
