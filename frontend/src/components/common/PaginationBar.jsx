import React from 'react';

function getWindowedPages(safePage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [1];
  if (safePage > 3) pages.push('left-ellipsis');
  const start = Math.max(2, safePage - 1);
  const end = Math.min(totalPages - 1, safePage + 1);
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }
  if (safePage < totalPages - 2) pages.push('right-ellipsis');
  pages.push(totalPages);
  return pages;
}

export default function PaginationBar({
  currentPage,
  totalItems,
  pageSize = 5,
  onPageChange,
  itemLabel = 'records',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, totalItems);

  if (totalItems === 0) return null;

  const pages = getWindowedPages(safePage, totalPages);

  return (
    <div className="pagination-bar">
      <div className="pagination-bar__info">
        Showing <strong style={{ color: 'var(--ink, #1C2340)' }}>{startIdx}</strong>–
        <strong style={{ color: 'var(--ink, #1C2340)' }}>{endIdx}</strong> of{' '}
        <strong style={{ color: 'var(--ink, #1C2340)' }}>{totalItems}</strong> {itemLabel}
      </div>

      <div className="pagination-bar__controls">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            opacity: safePage <= 1 ? 0.5 : 1,
            cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          ← Prev
        </button>

        {pages.map((p) => {
          if (typeof p === 'string') {
            return (
              <span key={p} style={{ padding: '0 4px', color: 'var(--slate)', fontWeight: 700 }}>
                …
              </span>
            );
          }
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                minWidth: 28,
                height: 28,
                padding: '0 8px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: p === safePage ? '1.5px solid #123B5D' : '1px solid #D1DDE8',
                background: p === safePage ? '#123B5D' : '#FFFFFF',
                color: p === safePage ? '#FFFFFF' : '#123B5D',
              }}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            opacity: safePage >= totalPages ? 0.5 : 1,
            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
