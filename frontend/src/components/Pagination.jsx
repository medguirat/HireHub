export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pages">
      <button type="button" className="secondary-btn btn-compact" disabled={page === 0} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="text-muted text-sm" aria-current="page">Page {page + 1} of {totalPages}</span>
      <button type="button" className="secondary-btn btn-compact" disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}
