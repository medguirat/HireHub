import { useState, useEffect } from "react";
import recruiterService from "../services/recruiterService";
import fetchAllPages from "../utils/fetchAllPages";
import AlertModal from "../components/AlertModal";
import { SkeletonCards } from "../components/Skeleton";

const TIMEFRAMES = [
  { key: "3M", months: 3, label: "Last 3 months" },
  { key: "6M", months: 6, label: "Last 6 months" },
  { key: "1Y", months: 12, label: "Last 12 months" },
];

const CONTRACTS = [
  { types: ["CDI"], title: "CDI", subtitle: "Permanent contracts", accent: "violet", icon: "💼" },
  { types: ["CDD"], title: "CDD", subtitle: "Fixed-term contracts", accent: "cyan", icon: "📄" },
  { types: ["STAGE", "INTERNSHIP"], title: "Internships", subtitle: "Students and trainees", accent: "green", icon: "🎓" },
  { types: ["FREELANCE"], title: "Freelance", subtitle: "Independent contractors", accent: "magenta", icon: "🚀" },
];

const OUTCOMES = [
  { status: "ACCEPTED", label: "Accepted", accent: "green", ring: "donut__accepted" },
  { status: "PENDING", label: "Pending review", accent: "orange", ring: "donut__pending" },
  { status: "REJECTED", label: "Rejected", accent: "red", ring: "donut__rejected" },
];

const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

// Chart geometry: x spread over 800 units, y from 220 (zero) up to 40 (period maximum).
function chartGeometry(points) {
  const maxApps = Math.max(1, ...points.map((p) => p.apps));
  const coords = points.map((p, i) => ({
    x: points.length === 1 ? 400 : (i * 800) / (points.length - 1),
    y: 220 - (p.apps / maxApps) * 180,
    apps: p.apps,
  }));
  const line = coords.reduce((path, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = coords[i - 1];
    const midX = (prev.x + pt.x) / 2;
    return `${path} C ${midX} ${prev.y}, ${midX} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");
  const area = `${line} L ${coords[coords.length - 1].x} 220 L ${coords[0].x} 220 Z`;
  return { coords, line, area };
}

const DONUT_RADIUS = 24;
const DONUT_LENGTH = 2 * Math.PI * DONUT_RADIUS;

export default function RecruiterStats() {
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeframe, setTimeframe] = useState("6M");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allOffers, allApplications] = await Promise.all([
        fetchAllPages(recruiterService.getOffers),
        fetchAllPages(recruiterService.getApplications)
      ]);
      setOffers(allOffers);
      setApplications(allApplications);
    } catch (err) {
      console.error(err);
      setErrorMsg("Your statistics couldn't be loaded. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const totalOffers = offers.length;
  const totalApplications = applications.length;

  const contracts = CONTRACTS.map((c) => {
    const count = offers.filter((o) => c.types.includes((o.contractType || "").toUpperCase())).length;
    return { ...c, count, pct: percent(count, totalOffers) };
  });

  let donutStart = 0;
  const outcomes = OUTCOMES.map((o) => {
    const count = applications.filter((a) => a.status === o.status).length;
    const length = totalApplications ? (count / totalApplications) * DONUT_LENGTH : 0;
    const segment = { ...o, count, pct: percent(count, totalApplications), length, start: donutStart };
    donutStart += length;
    return segment;
  });
  const acceptedPct = outcomes[0].pct;

  // Applications received per month over the selected period, from real application dates.
  const { months, label: periodLabel } = TIMEFRAMES.find((t) => t.key === timeframe);
  const now = new Date();
  const monthly = Array.from({ length: months }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      month: date.toLocaleString("en", { month: "short" }),
      apps: applications.filter((a) => (a.applicationDate || "").startsWith(key)).length
    };
  });
  const periodTotal = monthly.reduce((sum, p) => sum + p.apps, 0);
  const chart = chartGeometry(monthly);

  return (
    <div className="page-stack">
      <div className="row-end">
        <div className="segmented" role="group" aria-label="Period">
          {TIMEFRAMES.map((t) => (
            <button key={t.key} type="button" aria-pressed={timeframe === t.key} title={t.label}
              onClick={() => setTimeframe(t.key)}>
              {t.key}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <>
          <section className="grid-cards" aria-label="Offers by contract type">
            {contracts.map((c) => (
              <article key={c.title} className={`metric-card accent-${c.accent}`}>
                <div className="metric-card__head">
                  <div className="row">
                    <span className="icon-bubble" aria-hidden="true">{c.icon}</span>
                    <div>
                      <div className="metric-card__title">{c.title}</div>
                      <div className="metric-card__subtitle">{c.subtitle}</div>
                    </div>
                  </div>
                  <span className="pill">{c.pct}%</span>
                </div>
                <div className="metric-value">
                  {c.count} <span className="metric-unit">{c.count === 1 ? "offer" : "offers"}</span>
                </div>
                <progress className="meter" max="100" value={c.pct} aria-label={`${c.title}: ${c.pct}% of your offers`} />
              </article>
            ))}
          </section>

          <div className="grid-main-aside">
            <section className="glass-card stack-lg">
              <div className="row-between">
                <div>
                  <h2 className="section-title">Applications per month</h2>
                  <p className="section-sub">{periodLabel} · {periodTotal} application{periodTotal === 1 ? "" : "s"}</p>
                </div>
                <span className="row text-sm accent-magenta text-accent">
                  <span className="legend-dot" aria-hidden="true" /> Applications
                </span>
              </div>

              <div className="chart" role="img"
                aria-label={monthly.map((p) => `${p.month}: ${p.apps}`).join(", ")}>
                <svg viewBox="0 0 800 240" aria-hidden="true">
                  <defs>
                    <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop className="chart__area-stop" offset="0%" stopOpacity="0.45" />
                      <stop className="chart__area-stop" offset="100%" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[40, 90, 140, 190].map((y) => (
                    <line key={y} className="chart__grid" x1="0" y1={y} x2="800" y2={y} />
                  ))}
                  <path className="chart__area" d={chart.area} />
                  <path className="chart__line" d={chart.line} />
                  {chart.coords.map((pt, i) => (
                    <g key={i}>
                      <circle className="chart__point" cx={pt.x} cy={pt.y} r="5" />
                      {pt.apps > 0 && <text className="chart__value" x={pt.x} y={pt.y - 12}>{pt.apps}</text>}
                    </g>
                  ))}
                  {periodTotal === 0 && (
                    <text className="chart__empty" x="400" y="130">No applications received in this period</text>
                  )}
                </svg>
                <div className="chart__axis">
                  {monthly.map((p, i) => (
                    <span key={i} className={i === monthly.length - 1 ? "is-current" : undefined}>{p.month}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="glass-card stack-lg">
              <div>
                <h2 className="section-title">Application outcomes</h2>
                <p className="section-sub">Where every application to your offers stands</p>
              </div>

              <div className="summary-box">
                <span className="donut-wrap">
                  <svg className="donut" viewBox="0 0 60 60" aria-hidden="true">
                    <circle className="donut__track" cx="30" cy="30" r={DONUT_RADIUS} />
                    {outcomes.filter((o) => o.length > 0).map((o) => (
                      <circle key={o.status} className={o.ring} cx="30" cy="30" r={DONUT_RADIUS}
                        strokeDasharray={`${o.length} ${DONUT_LENGTH}`} strokeDashoffset={-o.start} />
                    ))}
                  </svg>
                  <span className="donut-wrap__label">{totalApplications}</span>
                </span>
                <div>
                  <div className="text-strong">Total applications</div>
                  <div className="text-sm accent-green text-accent">{acceptedPct}% accepted</div>
                </div>
              </div>

              <ul className="stack list-reset" aria-label="Applications by status">
                {outcomes.map((o) => (
                  <li key={o.status} className={`status-row accent-${o.accent}`}>
                    <span className="status-row__label"><span className="legend-dot" aria-hidden="true" />{o.label}</span>
                    <span className="status-row__value">{o.count} ({o.pct}%)</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="glass-card stack-lg">
            <div>
              <h2 className="section-title">Offers by contract type</h2>
              <p className="section-sub">Share of your {totalOffers} published offer{totalOffers === 1 ? "" : "s"}</p>
            </div>
            <div className="grid-cards">
              {contracts.map((c) => (
                <div key={c.title} className={`subtle-card stack accent-${c.accent}`}>
                  <div className="row-between text-sm">
                    <span className="text-strong">{c.title} · {c.subtitle}</span>
                    <span className="text-accent text-strong">{c.count} ({c.pct}%)</span>
                  </div>
                  <progress className="meter meter--thick meter--solid" max="100" value={c.pct}
                    aria-label={`${c.title}: ${c.pct}%`} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <AlertModal
        isOpen={!!errorMsg}
        type="error"
        title="Something went wrong"
        message={errorMsg}
        onClose={() => setErrorMsg("")}
      />
    </div>
  );
}
