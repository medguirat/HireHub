import { useState, useEffect } from "react";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";

export default function RecruiterStats() {
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const offersData = await recruiterService.getOffers(0, 50);
      const appsData = await recruiterService.getApplications(0, 100);
      setOffers(offersData.content || []);
      setApplications(appsData.content || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load statistics data.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalOffers = offers.length;
  const totalApplications = applications.length;
  const pendingApps = applications.filter((app) => app.status === "PENDING").length;
  const acceptedApps = applications.filter((app) => app.status === "ACCEPTED").length;
  const rejectedApps = applications.filter((app) => app.status === "REJECTED").length;

  const countContracts = (type) => {
    return offers.filter((o) => (o.contractType || "").toUpperCase() === type.toUpperCase()).length;
  };

  const cdiCount = countContracts("CDI");
  const cddCount = countContracts("CDD");
  const stageCount = countContracts("STAGE");
  const freelanceCount = countContracts("FREELANCE");

  // Determine percentages for UI bars
  const cdiPct = totalOffers ? (cdiCount / totalOffers) * 100 : 0;
  const cddPct = totalOffers ? (cddCount / totalOffers) * 100 : 0;
  const stagePct = totalOffers ? (stageCount / totalOffers) * 100 : 0;
  const freelancePct = totalOffers ? (freelanceCount / totalOffers) * 100 : 0;

  const acceptedPct = totalApplications ? (acceptedApps / totalApplications) * 100 : 0;
  const rejectedPct = totalApplications ? (rejectedApps / totalApplications) * 100 : 0;
  const pendingPct = totalApplications ? (pendingApps / totalApplications) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      <div className="panel-header">
        <h2>Recruitment Analytics</h2>
      </div>

      {loading ? (
        <div className="loading-container">
          <div>Loading stats graphs...</div>
        </div>
      ) : (
        <div className="stats-page-grid">
          <div className="dashboard-panel">
            <h3>Job Offers by Contract Type</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "20px" }}>
              Distribution of your published offers contract agreements.
            </p>
            
            <div className="chart-placeholder" style={{ height: "auto", display: "block" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "6px" }}>
                    <span>CDI ({cdiCount})</span>
                    <span>{Math.round(cdiPct)}%</span>
                  </div>
                  <div style={{ width: "100%", height: "10px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "5px" }}>
                    <div style={{ width: `${cdiPct}%`, height: "100%", backgroundColor: "var(--color-primary)", borderRadius: "5px", transition: "width 0.5s ease" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "6px" }}>
                    <span>CDD ({cddCount})</span>
                    <span>{Math.round(cddPct)}%</span>
                  </div>
                  <div style={{ width: "100%", height: "10px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "5px" }}>
                    <div style={{ width: `${cddPct}%`, height: "100%", backgroundColor: "#c084fc", borderRadius: "5px", transition: "width 0.5s ease" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "6px" }}>
                    <span>Stage / Internship ({stageCount})</span>
                    <span>{Math.round(stagePct)}%</span>
                  </div>
                  <div style={{ width: "100%", height: "10px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "5px" }}>
                    <div style={{ width: `${stagePct}%`, height: "100%", backgroundColor: "var(--color-success)", borderRadius: "5px", transition: "width 0.5s ease" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "6px" }}>
                    <span>Freelance ({freelanceCount})</span>
                    <span>{Math.round(freelancePct)}%</span>
                  </div>
                  <div style={{ width: "100%", height: "10px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "5px" }}>
                    <div style={{ width: `${freelancePct}%`, height: "100%", backgroundColor: "var(--color-warning)", borderRadius: "5px", transition: "width 0.5s ease" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h3>Application Status Ratio</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "20px" }}>
              State of candidate review process.
            </p>

            <div className="chart-placeholder" style={{ height: "auto", display: "block" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "var(--color-success)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                      <span>Accepted</span>
                      <strong>{acceptedApps} ({Math.round(acceptedPct)}%)</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "var(--color-warning)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                      <span>Pending</span>
                      <strong>{pendingApps} ({Math.round(pendingPct)}%)</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "var(--color-danger)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                      <span>Rejected</span>
                      <strong>{rejectedApps} ({Math.round(rejectedPct)}%)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Operation Failed"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}
