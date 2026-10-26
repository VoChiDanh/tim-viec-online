"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye, Pencil, Plus, Search, BriefcaseBusiness } from "lucide-react";
import { toast } from "sonner";
import { useEmployer } from "./employer-provider";
import { effectiveJobStatus } from "@/features/employer/rules";
import { JOB_STATUS_LABELS, type EmployerJob } from "@/features/employer/types";
import { normalizeSearch } from "@/features/jobs/query";
import { formatSalary } from "@/features/jobs/formatters";
import { SelectionField } from "@/components/forms/selection-field";
import { Pagination } from "@/components/layout/pagination";
import "./employer-overview.css";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogMedia,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from "@/modules/cores/shadcn/components/ui/alert-dialog";

function StatusAction({ job }: { job: EmployerJob }) {
  const { changeJobStatus, today } = useEmployer();
  const [open, setOpen] = useState(false);
  const status = effectiveJobStatus(job, today);
  if (status === "expired")
    return (
      <Link href={`/employer/jobs/${job.id}/edit`} className="ep-text-link">
        Gia hạn tin
      </Link>
    );
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button type="button" className="ep-text-link">
          {status === "active" ? "Đóng tin" : "Mở lại tin"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <BriefcaseBusiness aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {status === "active"
              ? "Đóng tin tuyển dụng?"
              : "Mở lại tin tuyển dụng?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {job.title}. Hồ sơ đã nhận và hội thoại vẫn được bảo lưu để bạn tiếp
            tục xử lý.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const error = changeJobStatus(
                job.id,
                status === "active" ? "closed" : "active",
              );
              if (error) toast.error(error);
              else toast.success("Đã cập nhật tin trong phiên xem trước.");
            }}
          >
            Xác nhận
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function EmployerJobs({ compact = false }: { compact?: boolean }) {
  const { jobs, applications, today } = useEmployer();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const status = compact ? "all" : (params.get("status") ?? "all");
  const keyword = compact ? "" : (params.get("keyword") ?? "");
  const sort = compact ? "updated" : (params.get("sort") ?? "updated");
  const setQuery = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const count = (id: number) =>
    applications.filter((app) => app.job_id === id).length;
  const newCount = (id: number) =>
    applications.filter((app) => app.job_id === id && app.status === "applied")
      .length;
  const filtered = jobs
    .filter(
      (job) =>
        (status === "all" || effectiveJobStatus(job, today) === status) &&
        normalizeSearch(`${job.title} ${job.id}`).includes(
          normalizeSearch(keyword),
        ),
    )
    .sort((a, b) =>
      sort === "applications"
        ? count(b.id) - count(a.id)
        : sort === "deadline"
          ? a.deadline.localeCompare(b.deadline)
          : b.updated_at.localeCompare(a.updated_at),
    );
  const size = compact ? 4 : 5;
  const lastPage = Math.max(1, Math.ceil(filtered.length / size));
  const requested = Number(params.get("page") ?? 1);
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, lastPage)
      : 1;
  const visible = compact
    ? filtered.slice(0, 4)
    : filtered.slice((page - 1) * size, page * size);
  const pageUrl = (number: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(number));
    return `${pathname}?${next}`;
  };
  return (
    <>
      {!compact && (
        <div className="ep-page-heading">
          <div>
            <h1>Tin tuyển dụng của bạn</h1>
            <p>Quản lý tin đăng và theo dõi hồ sơ theo từng vị trí.</p>
          </div>
          <Link
            className="ep-button ep-button-primary"
            href="/employer/jobs/new"
          >
            <Plus className="ep-icon" />
            Đăng tin tuyển dụng
          </Link>
        </div>
      )}
      <section
        className={`ep-panel ep-owned-jobs${compact ? " ep-owned-jobs-compact" : ""}`}
        aria-label="Danh sách tin tuyển dụng"
      >
        {compact && (
          <div className="ep-panel-heading">
            <div>
              <h2>Tin tuyển dụng của bạn</h2>
              <p>Các tin cập nhật gần đây và hồ sơ cần xử lý.</p>
            </div>
            <Link className="ep-text-link" href="/employer/jobs">
              Xem tất cả
            </Link>
          </div>
        )}
        {!compact && (
          <>
            <nav className="ep-tabs" aria-label="Lọc trạng thái tin tuyển dụng">
              {[["all", "Tất cả"], ...Object.entries(JOB_STATUS_LABELS)].map(
                ([key, label]) => (
                  <button
                    className="ep-tab"
                    key={key}
                    type="button"
                    aria-pressed={status === key}
                    data-active={status === key}
                    onClick={() => setQuery("status", key)}
                  >
                    {label}
                    <span>
                      {key === "all"
                        ? jobs.length
                        : jobs.filter(
                            (job) => effectiveJobStatus(job, today) === key,
                          ).length}
                    </span>
                  </button>
                ),
              )}
            </nav>
            <div className="ep-filters">
              <label className="ep-search">
                <Search className="ep-icon" />
                <input
                  type="search"
                  aria-label="Tìm tin tuyển dụng"
                  placeholder="Tìm theo vị trí hoặc mã tin..."
                  value={keyword}
                  onChange={(event) => setQuery("keyword", event.target.value)}
                />
              </label>
              <SelectionField
                name="job_sort"
                label="Sắp xếp tin tuyển dụng"
                placeholder="Cập nhật mới nhất"
                value={sort}
                clearable={false}
                onValueChange={(value) => setQuery("sort", value || "updated")}
                options={[
                  { value: "updated", label: "Cập nhật mới nhất" },
                  { value: "applications", label: "Nhiều hồ sơ nhất" },
                  { value: "deadline", label: "Hạn nộp gần nhất" },
                ]}
              />
            </div>
          </>
        )}
        {visible.length ? (
          <table className="ep-job-table">
            <caption className="sr-only">
              Tin đã đăng và số lượng hồ sơ đã nhận
            </caption>
            <thead>
              <tr>
                <th scope="col">Vị trí tuyển dụng</th>
                <th scope="col">Hồ sơ</th>
                <th scope="col">Trạng thái / Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((job) => {
                const status = effectiveJobStatus(job, today);
                return (
                  <tr key={job.id}>
                    <td>
                      <Link
                        className="ep-job-title"
                        href={`/employer/jobs/${job.id}/edit`}
                        aria-label={`Xem/sửa tin ${job.title}`}
                      >
                        {job.title}
                      </Link>
                      <div className="ep-job-meta">
                        #{job.id} · {job.city} · {job.job_level}
                      </div>
                      <div className="ep-job-meta">
                        {formatSalary(job)} · Hạn{" "}
                        {job.deadline.split("-").reverse().join("/")}
                      </div>
                    </td>
                    <td>
                      <Link
                        className="ep-job-count"
                        href={`/employer/candidates?job_id=${job.id}`}
                      >
                        <span className="ep-application-count">
                          {count(job.id)}
                        </span>{" "}
                        <span>hồ sơ</span>
                      </Link>
                      {newCount(job.id) > 0 && (
                        <Link
                          className="ep-job-new"
                          href={`/employer/candidates?job_id=${job.id}&status=applied`}
                        >
                          {newCount(job.id)} chưa xem
                        </Link>
                      )}
                    </td>
                    <td>
                      <span className={`ep-badge ep-badge-${status} ep-status`}>
                        {JOB_STATUS_LABELS[status]}
                      </span>
                      <div className="ep-row-actions">
                        <Link
                          href={`/employer/candidates?job_id=${job.id}`}
                          aria-label={`Xem hồ sơ cho ${job.title}`}
                          className="ep-job-review"
                        >
                          <Eye size={15} aria-hidden="true" />
                          Xem hồ sơ
                        </Link>
                        <Link
                          href={`/employer/jobs/${job.id}/edit`}
                          aria-label={`Sửa tin ${job.title}`}
                        >
                          <Pencil size={15} aria-hidden="true" />
                          Sửa tin
                        </Link>
                        <StatusAction job={job} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="ep-empty">
            <BriefcaseBusiness className="ep-icon" aria-hidden="true" />
            <strong>
              {jobs.length
                ? "Không tìm thấy tin tuyển dụng"
                : "Chưa có tin tuyển dụng"}
            </strong>
            <p>
              {jobs.length
                ? "Thử một từ khóa hoặc trạng thái khác."
                : "Tạo tin đầu tiên để giới thiệu cơ hội và nhận hồ sơ ứng tuyển."}
            </p>
            {jobs.length ? (
              <button
                type="button"
                className="ep-button"
                onClick={() => router.push(pathname, { scroll: false })}
              >
                Xóa bộ lọc
              </button>
            ) : (
              <Link
                className="ep-button ep-button-primary"
                href="/employer/jobs/new"
              >
                Đăng tin tuyển dụng
              </Link>
            )}
          </div>
        )}
        {!compact && (
          <Pagination
            page={page}
            lastPage={lastPage}
            pageUrl={pageUrl}
            label="Phân trang tin tuyển dụng"
          />
        )}
        <div className="ep-table-footer">
          <span role="status">
            {compact
              ? `${visible.length}/${jobs.length} tin tuyển dụng`
              : `${filtered.length ? (page - 1) * size + 1 : 0}–${Math.min(page * size, filtered.length)} / ${filtered.length} tin tuyển dụng`}
          </span>
          <span>Hồ sơ vẫn được lưu khi đóng tin</span>
        </div>
      </section>
    </>
  );
}
