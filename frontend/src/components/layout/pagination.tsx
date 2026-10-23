import Link from "next/link";
import { paginationPages } from "@/features/pagination";

export function Pagination({
  page,
  lastPage,
  pageUrl,
  label = "Phân trang",
}: {
  page: number;
  lastPage: number;
  pageUrl: (page: number) => string;
  label?: string;
}) {
  if (lastPage <= 1) return null;
  return (
    <nav className="pagination" aria-label={label}>
      {page > 1 && (
        <>
          <Link href={pageUrl(1)} aria-label="Trang đầu">
            &lt;&lt;
          </Link>
          <Link href={pageUrl(page - 1)} aria-label="Trang trước">
            &lt;
          </Link>
        </>
      )}
      {paginationPages(page, lastPage).map((number) => (
        <Link
          key={number}
          href={pageUrl(number)}
          aria-label={`Trang ${number}`}
          aria-current={number === page ? "page" : undefined}
        >
          {number}
        </Link>
      ))}
      {page < lastPage && (
        <Link href={pageUrl(page + 1)} aria-label="Trang sau">
          &gt;
        </Link>
      )}
    </nav>
  );
}
