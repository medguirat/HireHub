// Placeholder shapes shown while a list or table loads.
export function SkeletonCards({ count = 3 }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-line skeleton-line--row" />
      ))}
    </div>
  );
}
