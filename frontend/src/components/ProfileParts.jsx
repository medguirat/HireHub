// Building blocks shared by the candidate and recruiter profile pages.

export function SectionCard({ title, id, action, children, className = "" }) {
  return (
    <section className={`glass-card profile-section ${className}`} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="row-between profile-section__head">
        <h2 id={id ? `${id}-title` : undefined} className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Empty-field placeholder in view mode: says what's missing, never invents a value. */
export function Missing({ children }) {
  return <p className="profile-missing">{children}</p>;
}

/**
 * items: [{ key, label, done, weight, suggestion, onFix }]
 * Score = sum of the weights of completed items. Up to 3 suggestions, biggest first.
 */
export function ProfileCompleteness({ items, title = "Profile completeness" }) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  const done = items.filter((i) => i.done).reduce((sum, i) => sum + i.weight, 0);
  const score = total ? Math.round((done / total) * 100) : 0;
  const todo = items.filter((i) => !i.done).sort((a, b) => b.weight - a.weight).slice(0, 3);
  const accent = score >= 80 ? "green" : score >= 50 ? "cyan" : "orange";

  return (
    <section className={`glass-card completeness accent-${accent}`} aria-labelledby="completeness-title">
      <div className="row-between">
        <h2 id="completeness-title" className="section-title">{title}</h2>
        <span className="completeness__score text-accent">{score}%</span>
      </div>
      <progress className="meter meter--thick" max="100" value={score} aria-label={`${title}: ${score}%`} />
      {todo.length === 0 ? (
        <p className="text-sub text-sm">Your profile is complete.</p>
      ) : (
        <>
          <p className="text-muted text-sm">To complete your profile:</p>
          <ul className="completeness__todo list-reset">
            {todo.map((item) => (
              <li key={item.key}>
                <button type="button" className="completeness__fix" onClick={item.onFix}>
                  <span className="completeness__plus" aria-hidden="true">+</span>
                  <span className="grow">{item.suggestion}</span>
                  <span className="text-xs text-muted">+{Math.round((item.weight / total) * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Says where a draft came from, so nothing looks more automatic (or more "AI") than it is. */
export function DraftNote({ draft }) {
  if (!draft) return null;
  return (
    <p className="draft-note" role="status">
      {draft.ai_assisted && <span className="pill accent-violet">AI-assisted</span>}
      <span>
        {draft.ai_assisted
          ? "Reworded by the AI assistant from your own profile data only. "
          : "Built from your own profile data only. "}
        Review and edit it before saving.
      </span>
    </p>
  );
}
