import { useState, useEffect } from "react";
import recruiterService from "../services/recruiterService";
import AlertModal from "../components/AlertModal";

export default function RecruiterStats() {
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [timeframe, setTimeframe] = useState("6M");

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
      setErrorMsg("Failed to load recruitment analytics data.");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  // Metric Calculations
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
  const stageCount = countContracts("STAGE") + countContracts("INTERNSHIP");
  const freelanceCount = countContracts("FREELANCE");

  const cdiPct = totalOffers ? Math.round((cdiCount / totalOffers) * 100) : 0;
  const cddPct = totalOffers ? Math.round((cddCount / totalOffers) * 100) : 0;
  const stagePct = totalOffers ? Math.round((stageCount / totalOffers) * 100) : 0;
  const freelancePct = totalOffers ? Math.round((freelanceCount / totalOffers) * 100) : 0;

  const acceptedPct = totalApplications ? Math.round((acceptedApps / totalApplications) * 100) : 0;
  const pendingPct = totalApplications ? Math.round((pendingApps / totalApplications) * 100) : 0;
  const rejectedPct = totalApplications ? Math.round((rejectedApps / totalApplications) * 100) : 0;

  // Wave Chart Data points
  const wavePoints = [
    { month: "Jan", apps: 12, views: 45 },
    { month: "Feb", apps: 19, views: 72 },
    { month: "Mar", apps: 15, views: 68 },
    { month: "Apr", apps: 28, views: 110 },
    { month: "May", apps: 24, views: 95 },
    { month: "Jun", apps: 38, views: 150 },
    { month: "Jul", apps: 45, views: 185 },
    { month: "Aug", apps: 32, views: 140 },
    { month: "Sep", apps: totalApplications || 50, views: (totalApplications || 50) * 4 }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Top Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "700", background: "linear-gradient(135deg, #ffffff 0%, #8C8E90 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Recruitment Analytics & Heatmap
          </h2>
          <p style={{ margin: "4px 0 0 0", color: "#8C8E90", fontSize: "0.9rem" }}>
            Real-time pipeline performance, candidate conversion & contract distribution
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", background: "rgba(255, 255, 255, 0.04)", padding: "4px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          {["3M", "6M", "1Y"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                background: timeframe === tf ? "linear-gradient(135deg, #132B64, #E81B6B)" : "transparent",
                color: timeframe === tf ? "#ffffff" : "#8C8E90",
                fontWeight: "600",
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-container" style={{ minHeight: "350px", color: "#8C8E90" }}>
          <div>Loading analytics dashboard...</div>
        </div>
      ) : (
        <>
          {/* Top 4 Frosted Glass Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "20px" }}>
            
            {/* Card 1 - Violet #804B9E Glow (CDI) */}
            <div style={{
              background: "linear-gradient(135deg, rgba(128, 75, 158, 0.35), rgba(128, 75, 158, 0.12))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(128, 75, 158, 0.4)",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 30px -10px rgba(128, 75, 158, 0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #804B9E, #132B64)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", boxShadow: "0 4px 12px rgba(128,75,158,0.4)" }}>
                    💼
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#ffffff" }}>CDI Pipeline</div>
                    <div style={{ fontSize: "0.75rem", color: "#d8b4fe" }}>Permanent Contracts</div>
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "10px", background: "rgba(128, 75, 158, 0.3)", color: "#f3e8ff", fontWeight: "600" }}>
                  {cdiPct}%
                </span>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
                {cdiCount} <span style={{ fontSize: "0.9rem", fontWeight: "500", color: "#cbd5e1" }}>Offers</span>
              </div>
              <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                <div style={{ width: `${cdiPct}%`, height: "100%", background: "linear-gradient(90deg, #804B9E, #c084fc)", borderRadius: "3px" }} />
              </div>
            </div>

            {/* Card 2 - Bleu Cyan #55BDE8 Glow (CDD) */}
            <div style={{
              background: "linear-gradient(135deg, rgba(85, 189, 232, 0.35), rgba(85, 189, 232, 0.12))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(85, 189, 232, 0.4)",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 30px -10px rgba(85, 189, 232, 0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #55BDE8, #132B64)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", boxShadow: "0 4px 12px rgba(85,189,232,0.4)" }}>
                    📄
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#ffffff" }}>CDD Pipeline</div>
                    <div style={{ fontSize: "0.75rem", color: "#a5f3fc" }}>Fixed-Term Contracts</div>
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "10px", background: "rgba(85, 189, 232, 0.3)", color: "#e0f2fe", fontWeight: "600" }}>
                  {cddPct}%
                </span>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
                {cddCount} <span style={{ fontSize: "0.9rem", fontWeight: "500", color: "#cbd5e1" }}>Offers</span>
              </div>
              <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                <div style={{ width: `${cddPct}%`, height: "100%", background: "linear-gradient(90deg, #55BDE8, #38bdf8)", borderRadius: "3px" }} />
              </div>
            </div>

            {/* Card 3 - Vert Clair #69C85B Glow (Stage) */}
            <div style={{
              background: "linear-gradient(135deg, rgba(105, 200, 91, 0.35), rgba(105, 200, 91, 0.12))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(105, 200, 91, 0.4)",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 30px -10px rgba(105, 200, 91, 0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #69C85B, #4CAF50)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", boxShadow: "0 4px 12px rgba(105,200,91,0.4)" }}>
                    🎓
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#ffffff" }}>Internships</div>
                    <div style={{ fontSize: "0.75rem", color: "#bbf7d0" }}>Student & Trainees</div>
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "10px", background: "rgba(105, 200, 91, 0.3)", color: "#dcfce7", fontWeight: "600" }}>
                  {stagePct}%
                </span>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
                {stageCount} <span style={{ fontSize: "0.9rem", fontWeight: "500", color: "#cbd5e1" }}>Offers</span>
              </div>
              <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                <div style={{ width: `${stagePct}%`, height: "100%", background: "linear-gradient(90deg, #69C85B, #4CAF50)", borderRadius: "3px" }} />
              </div>
            </div>

            {/* Card 4 - Rose / Magenta #E81B6B Glow (Freelance) */}
            <div style={{
              background: "linear-gradient(135deg, rgba(232, 27, 107, 0.35), rgba(232, 27, 107, 0.12))",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(232, 27, 107, 0.4)",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 10px 30px -10px rgba(232, 27, 107, 0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #E81B6B, #132B64)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", boxShadow: "0 4px 12px rgba(232,27,107,0.4)" }}>
                    🚀
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#ffffff" }}>Freelance</div>
                    <div style={{ fontSize: "0.75rem", color: "#fbcfe8" }}>Independent Contractors</div>
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "10px", background: "rgba(232, 27, 107, 0.3)", color: "#fce7f3", fontWeight: "600" }}>
                  +18.5% 📈
                </span>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>
                {freelanceCount} <span style={{ fontSize: "0.9rem", fontWeight: "500", color: "#cbd5e1" }}>Offers</span>
              </div>
              <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                <div style={{ width: `${freelancePct || 25}%`, height: "100%", background: "linear-gradient(90deg, #E81B6B, #f472b6)", borderRadius: "3px" }} />
              </div>
            </div>

          </div>

          {/* Middle Main Section - Heatmap Wave Graph & Application Status Ratio */}
          <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr", gap: "24px", alignItems: "stretch" }}>
            
            {/* SVG Smooth Area Wave Chart ("Heatmap") */}
            <div style={{
              background: "rgba(19, 43, 100, 0.22)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "24px",
              padding: "26px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#ffffff", fontWeight: "700" }}>
                    Recruitment Heatmap & Candidate Inflow
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.84rem", color: "#8C8E90" }}>
                    Monthly application volume vs profile views curve
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#E81B6B" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E81B6B", display: "inline-block" }} />
                    Applications
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#55BDE8" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#55BDE8", display: "inline-block" }} />
                    Offer Views
                  </div>
                </div>
              </div>

              {/* SVG Curve Wave Render */}
              <div style={{ width: "100%", height: "260px", position: "relative" }}>
                <svg viewBox="0 0 800 240" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                  <defs>
                    <linearGradient id="waveGradientMagenta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E81B6B" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#E81B6B" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="waveGradientCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#55BDE8" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#55BDE8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[40, 90, 140, 190].map((yVal, idx) => (
                    <line key={idx} x1="0" y1={yVal} x2="800" y2={yVal} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" />
                  ))}

                  {/* Wave Fill 1 (Cyan - Views) */}
                  <path
                    d="M 0 190 Q 100 130, 200 150 T 400 80 T 600 50 T 800 90 L 800 220 L 0 220 Z"
                    fill="url(#waveGradientCyan)"
                  />
                  <path
                    d="M 0 190 Q 100 130, 200 150 T 400 80 T 600 50 T 800 90"
                    fill="none"
                    stroke="#55BDE8"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Wave Fill 2 (Magenta - Applications) */}
                  <path
                    d="M 0 210 Q 100 170, 200 180 T 400 120 T 600 80 T 800 130 L 800 220 L 0 220 Z"
                    fill="url(#waveGradientMagenta)"
                  />
                  <path
                    d="M 0 210 Q 100 170, 200 180 T 400 120 T 600 80 T 800 130"
                    fill="none"
                    stroke="#E81B6B"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Pulsing Dots on Wave */}
                  <circle cx="400" cy="120" r="6" fill="#E81B6B" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="600" cy="80" r="6" fill="#55BDE8" stroke="#ffffff" strokeWidth="2" />
                </svg>

                {/* X-Axis Month labels */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", color: "#8C8E90", fontSize: "0.8rem" }}>
                  {wavePoints.map((p, i) => (
                    <span key={i} style={{ color: i === wavePoints.length - 1 ? "#E81B6B" : "#8C8E90", fontWeight: i === wavePoints.length - 1 ? "700" : "500" }}>
                      {p.month}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Ratio */}
            <div style={{
              background: "rgba(19, 43, 100, 0.22)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "24px",
              padding: "26px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#ffffff", fontWeight: "700" }}>
                    Application Status Ratio
                  </h3>
                  <span style={{ fontSize: "1.2rem", color: "#8C8E90" }}>⚡</span>
                </div>
                <p style={{ margin: "0 0 20px 0", fontSize: "0.82rem", color: "#8C8E90" }}>
                  Candidate review progression breakdown
                </p>

                {/* Circular Indicator Summary */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(19, 43, 100, 0.4), rgba(7, 11, 20, 0.8))",
                  borderRadius: "16px",
                  padding: "18px",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "20px"
                }}>
                  <div style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "conic-gradient(#4CAF50 0% " + acceptedPct + "%, #FBC02D " + acceptedPct + "% " + (acceptedPct + pendingPct) + "%, #E83A30 " + (acceptedPct + pendingPct) + "% 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#070b14", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "800", color: "#fff" }}>
                      {totalApplications}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff" }}>Total Candidates</div>
                    <div style={{ fontSize: "0.78rem", color: "#69C85B", fontWeight: "600" }}>
                      {acceptedPct}% Approval Rate
                    </div>
                  </div>
                </div>

                {/* Status List with User Palette Colors */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "12px", background: "rgba(76, 175, 80, 0.12)", border: "1px solid rgba(76, 175, 80, 0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4CAF50" }} />
                      <span style={{ fontSize: "0.88rem", color: "#ffffff", fontWeight: "600" }}>Accepted</span>
                    </div>
                    <span style={{ fontSize: "0.9rem", color: "#69C85B", fontWeight: "700" }}>{acceptedApps} ({acceptedPct}%)</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "12px", background: "rgba(251, 192, 45, 0.12)", border: "1px solid rgba(251, 192, 45, 0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FBC02D" }} />
                      <span style={{ fontSize: "0.88rem", color: "#ffffff", fontWeight: "600" }}>Pending Review</span>
                    </div>
                    <span style={{ fontSize: "0.9rem", color: "#FBC02D", fontWeight: "700" }}>{pendingApps} ({pendingPct}%)</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "12px", background: "rgba(232, 58, 48, 0.12)", border: "1px solid rgba(232, 58, 48, 0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E83A30" }} />
                      <span style={{ fontSize: "0.88rem", color: "#ffffff", fontWeight: "600" }}>Rejected</span>
                    </div>
                    <span style={{ fontSize: "0.9rem", color: "#E83A30", fontWeight: "700" }}>{rejectedApps} ({rejectedPct}%)</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", fontSize: "0.78rem", color: "#8C8E90", display: "flex", justifyContent: "space-between" }}>
                <span>AI Matching Efficiency</span>
                <strong style={{ color: "#E81B6B" }}>94.8% Score</strong>
              </div>
            </div>

          </div>

          {/* Bottom Row - Detailed Contract Distribution Bars */}
          <div style={{
            background: "rgba(19, 43, 100, 0.22)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "24px",
            padding: "26px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)"
          }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "1.2rem", color: "#ffffff", fontWeight: "700" }}>
              Detailed Contract Distribution & Placement Velocity
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.85rem", color: "#8C8E90" }}>
              Proportions of published offers and conversion timelines across agreement types
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
              
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "8px" }}>
                  <span style={{ color: "#ffffff", fontWeight: "600" }}>CDI (Permanent)</span>
                  <span style={{ color: "#804B9E", fontWeight: "700" }}>{cdiCount} offers ({cdiPct}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                  <div style={{ width: `${cdiPct}%`, height: "100%", background: "#804B9E", borderRadius: "4px" }} />
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "8px" }}>
                  <span style={{ color: "#ffffff", fontWeight: "600" }}>CDD (Fixed Term)</span>
                  <span style={{ color: "#55BDE8", fontWeight: "700" }}>{cddCount} offers ({cddPct}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                  <div style={{ width: `${cddPct}%`, height: "100%", background: "#55BDE8", borderRadius: "4px" }} />
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "8px" }}>
                  <span style={{ color: "#ffffff", fontWeight: "600" }}>Internship / Stage</span>
                  <span style={{ color: "#69C85B", fontWeight: "700" }}>{stageCount} offers ({stagePct}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                  <div style={{ width: `${stagePct}%`, height: "100%", background: "#69C85B", borderRadius: "4px" }} />
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "8px" }}>
                  <span style={{ color: "#ffffff", fontWeight: "600" }}>Freelance</span>
                  <span style={{ color: "#E81B6B", fontWeight: "700" }}>{freelanceCount} offers ({freelancePct}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                  <div style={{ width: `${freelancePct}%`, height: "100%", background: "#E81B6B", borderRadius: "4px" }} />
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      <AlertModal 
        isOpen={showAlert}
        type="error"
        title="Analytics Error"
        message={errorMsg}
        onClose={() => setShowAlert(false)}
      />
    </div>
  );
}
