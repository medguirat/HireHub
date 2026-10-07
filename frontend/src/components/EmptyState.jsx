// An empty list that says what to do next.
export default function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="empty-state empty-state--cta">
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {actionLabel && (
        <button type="button" className="primary-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
