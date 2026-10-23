"use client";

import { paginationPages } from "@/features/pagination";

export function AdminPagination({
  page,
  lastPage,
  onPageChange,
  label = "Phân trang",
}: {
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (lastPage <= 1) return null;
  return (
    <nav className="pagination ap-pagination" aria-label={label}>
      {page > 1 && (
        <>
          <button
            type="button"
            aria-label="Trang đầu"
            onClick={() => onPageChange(1)}
          >
            &lt;&lt;
          </button>
          <button
            type="button"
            aria-label="Trang trước"
            onClick={() => onPageChange(page - 1)}
          >
            &lt;
          </button>
        </>
      )}
      {paginationPages(page, lastPage).map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`Trang ${number}`}
          aria-current={number === page ? "page" : undefined}
          onClick={() => onPageChange(number)}
        >
          {number}
        </button>
      ))}
      {page < lastPage && (
        <button
          type="button"
          aria-label="Trang sau"
          onClick={() => onPageChange(page + 1)}
        >
          &gt;
        </button>
      )}
    </nav>
  );
}
