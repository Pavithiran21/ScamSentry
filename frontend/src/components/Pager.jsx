import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

/** "1–10 of 27" with previous and next buttons, disabled at the ends. page starts at 1. */
export function Pager({ page, size, totalItems, totalPages, onPage }) {
  if (totalItems === 0) {
    return null;
  }
  const first = (page - 1) * size + 1;
  const last = Math.min(page * size, totalItems);
  return (
    <div className="pager">
      <span>
        {first}–{last} of {totalItems}
      </span>
      <span className="btns">
        <button
          type="button"
          className="icon-btn light"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <IconChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn light"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <IconChevronRight aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}
