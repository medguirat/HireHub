import { useState, useEffect } from "react";
import recruiterService from "../services/recruiterService";
import fetchAllPages from "../utils/fetchAllPages";
import { TIMEFRAMES, computeStats } from "../utils/recruiterStats";
import AlertModal from "../components/AlertModal";
import { SkeletonCards } from "../components/Skeleton";

const RING_CLASS = { ACCEPTED: "donut__accepted", PENDING: "donut__pending", REJECTED: "donut__rejected" };
const BAR_CLASS = { ACCEPTED: "stack-bar__accepted", PENDING: "stack-bar__pending", REJECTED: "stack-bar__rejected" };
const MAX_OFFER_ROWS = 8;

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
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function RecruiterStats() {
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeframe, setTimeframe] = useState("6M");

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const { months, label: periodLabel } = TIMEFRAMES.find((t) => t.key === timeframe);
  const stats = computeStats(offers, applications, months);
  const chart = chartGeometry(stats.monthly);

  // Each outcome's arc starts where the previous ones end.
  const rings = stats.outcomes
    .map((o, i) => {
      const lengthOf = (x) => (stats.totalApplications ? (x.count / stats.totalApplications) * DONUT_LENGTH : 0);
      const start = stats.outcomes.slice(0, i).reduce((sum, prev) => sum + lengthOf(prev), 0);
      return { status: o.status, length: lengthOf(o), start };
    })
    .filter((r) => r.length > 0);

  const maxPerOffer = Math.max(1, ...stats.perOffer.map((o) => o.total));

  return (
    <div className="page-stack">
      <div className="row-between">
        <p className="text-muted text-sm" aria-live="polite" data-testid="period-summary">
          {periodLabel}: {plural(stats.totalOffers, "offer")} published, {plural(stats.totalApplications, "application")} received.
        </p>
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
          <section className="grid-cards" aria-label="Offers published by contract type">
            {stats.contracts.map((c) => (
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
                <div className="metric-value" data-testid={`contract-${c.title}`}>
                  {c.count} <span className="metric-unit">{c.count === 1 ? "offer" : "offers"}</span>
                </div>
                <progress className="meter" max="100" value={c.pct} aria-label={`${c.title}: ${c.pct}% of the offers published in the period`} />
              </article>
            ))}
          </section>

          <div className="grid-main-aside">
            <section className="glass-card stack-lg">
              <div className="row-between">
                <div>
                  <h2 className="section-title">Applications per month</h2>
                  <p className="section-sub">{periodLabel} · {plural(stats.periodTotal, "application")}</p>
                </div>
                <span className="row text-sm accent-magenta text-accent">
                  <span className="legend-dot" aria-hidden="true" /> Applications
                </span>
              </div>

              <div className="chart" role="img"
                aria-label={stats.monthly.map((p) => `${p.month}: ${p.apps}`).join(", ")}>
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
                  {stats.periodTotal === 0 && (
                    <text className="chart__empty" x="400" y="130">No applications received in this period</text>
                  )}
                </svg>
                <div className="chart__axis">
                  {stats.monthly.map((p, i) => (
                    <span key={i} className={i === stats.monthly.length - 1 ? "is-current" : undefined}>{p.month}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="glass-card stack-lg">
              <div>
                <h2 className="section-title">Application outcomes</h2>
                <p className="section-sub">Where the period's applications stand</p>
              </div>

              <div className="summary-box">
                <span className="donut-wrap">
                  <svg className="donut" viewBox="0 0 60 60" aria-hidden="true">
                    <circle className="donut__track" cx="30" cy="30" r={DONUT_RADIUS} />
                    {rings.map((r) => (
                      <circle key={r.status} className={RING_CLASS[r.status]} cx="30" cy="30" r={DONUT_RADIUS}
                        strokeDasharray={`${r.length} ${DONUT_LENGTH}`} strokeDashoffset={-r.start} />
                    ))}
                  </svg>
                  <span className="donut-wrap__label">{stats.totalApplications}</span>
                </span>
                <div>
                  <div className="text-strong">{stats.totalApplications === 1 ? "Application" : "Applications"}</div>
                  <div className="text-sm accent-green text-accent">{stats.acceptedPct}% accepted</div>
                </div>
              </div>

              <ul className="stack list-reset" aria-label="Applications by status">
                {stats.outcomes.map((o) => (
                  <li key={o.status} className={`status-row accent-${o.accent}`}>
                    <span className="status-row__label"><span className="legend-dot" aria-hidden="true" />{o.label}</span>
                    <span className="status-row__value">{o.count} ({o.pct}%)</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="glass-card stack-lg" aria-labelledby="per-offer-title">
            <div className="row-between">
              <div>
                <h2 id="per-offer-title" className="section-title">Applications per offer</h2>
                <p className="section-sub">
                  {periodLabel} · your offers with the most applications, and where those applications stand
                </p>
              </div>
              <ul className="row list-reset text-sm" aria-label="Legend">
                {[["ACCEPTED", "Accepted", "green"], ["PENDING", "Pending", "orange"], ["REJECTED", "Rejected", "red"]].map(([k, label, accent]) => (
                  <li key={k} className={`row accent-${accent}`}><span className="legend-dot" aria-hidden="true" />{label}</li>
                ))}
              </ul>
            </div>

            {stats.perOffer.length === 0 ? (
              <p className="text-muted text-sm">No applications received in this period.</p>
            ) : (
              <ol className="per-offer list-reset">
                {stats.perOffer.slice(0, MAX_OFFER_ROWS).map((o) => (
                  <li key={o.id} className="per-offer__row">
                    <div className="row-between">
                      <span className="text-strong truncate">
                        {o.title}
                        {o.closed && <span className="status-chip status-chip--closed chip-inline">Closed</span>}
                      </span>
                      <span className="text-sm text-muted per-offer__count">{plural(o.total, "application")}</span>
                    </div>
                    <svg className="stack-bar" viewBox="0 0 100 8" preserveAspectRatio="none" role="img"
                      aria-label={`${o.ACCEPTED} accepted, ${o.PENDING} pending, ${o.REJECTED} rejected`}>
                      <rect className="stack-bar__track" x="0" y="0" width="100" height="8" rx="2" />
                      {(() => {
                        let x = 0;
                        return ["ACCEPTED", "PENDING", "REJECTED"].map((status) => {
                          const width = (o[status] / maxPerOffer) * 100;
                          const rect = width > 0 && (
                            <rect key={status} className={BAR_CLASS[status]} x={x} y="0" width={width} height="8" />
                          );
                          x += width;
                          return rect;
                        });
                      })()}
                    </svg>
                  </li>
                ))}
              </ol>
            )}
            {stats.perOffer.length > MAX_OFFER_ROWS && (
              <p className="hint">Showing the {MAX_OFFER_ROWS} offers with the most applications out of {stats.perOffer.length}.</p>
            )}
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
