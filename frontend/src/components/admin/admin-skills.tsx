"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  House,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/cores/shadcn/components/ui/dialog";
import { formatNumber, getInitialDatabase } from "@/features/admin/mock-data";
import type { AdminDatabase, AdminSkill } from "@/features/admin/types";
import "./admin.css";

const PAGE_SIZE = 6;
const MAX_SKILL_LENGTH = 100;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function AdminSkills() {
  const [db, setDb] = useState<AdminDatabase>(() => getInitialDatabase());
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | "used" | "unused">("all");
  const [sortFilter, setSortFilter] = useState<"name" | "usage" | "newest">("name");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<AdminSkill | null>(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingSkill, setDeletingSkill] = useState<AdminSkill | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reset preview data
  const handleResetPreview = () => {
    setDb(getInitialDatabase());
    setQuery("");
    setUsageFilter("all");
    setSortFilter("name");
    setCurrentPage(1);
    setIsEditOpen(false);
    setDeletingSkill(null);
    showToast("Đã khôi phục dữ liệu mẫu ban đầu.");
  };

  // Helper count jobs for a skill
  const jobsCountFor = (skillId: number): number => {
    return db.jobs.filter((j) => j.skills.includes(skillId)).length;
  };

  // Total usage (jobs + candidate CVs)
  const totalUsageFor = (skill: AdminSkill): number => {
    return jobsCountFor(skill.id) + (skill.candidates_count || 0);
  };

  // Metrics summary
  const totalSkills = db.skills.length;
  const usedCount = useMemo(
    () => db.skills.filter((s) => totalUsageFor(s) > 0).length,
    [db.skills, db.jobs],
  );
  const unusedCount = totalSkills - usedCount;

  // Filtered rows
  const filteredSkills = useMemo(() => {
    const q = normalize(query);
    return db.skills
      .filter((skill) => {
        const matchesQuery = !q || normalize(skill.name).includes(q);
        const usage = totalUsageFor(skill);
        const matchesUsage =
          usageFilter === "all" ||
          (usageFilter === "used" ? usage > 0 : usage === 0);
        return matchesQuery && matchesUsage;
      })
      .sort((a, b) => {
        if (sortFilter === "name") {
          return a.name.localeCompare(b.name, "vi");
        }
        if (sortFilter === "usage") {
          const usageA = totalUsageFor(a);
          const usageB = totalUsageFor(b);
          return usageB - usageA || a.name.localeCompare(b.name, "vi");
        }
        // newest
        return b.id - a.id;
      });
  }, [db.skills, db.jobs, query, usageFilter, sortFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedSkills = useMemo(
    () => filteredSkills.slice(startIndex, startIndex + PAGE_SIZE),
    [filteredSkills, startIndex],
  );

  // Clear filters
  const handleClearFilters = () => {
    setQuery("");
    setUsageFilter("all");
    setSortFilter("name");
    setCurrentPage(1);
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingSkill(null);
    setFormName("");
    setFormError(null);
    setIsEditOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (skill: AdminSkill) => {
    setEditingSkill(skill);
    setFormName(skill.name);
    setFormError(null);
    setIsEditOpen(true);
  };

  // Save (Create or Update) Skill
  const handleSaveSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim().replace(/\s+/g, " ");

    if (!trimmed) {
      setFormError("Vui lòng nhập tên kỹ năng.");
      return;
    }

    if (trimmed.length > MAX_SKILL_LENGTH) {
      setFormError(`Tên không được vượt quá ${MAX_SKILL_LENGTH} ký tự.`);
      return;
    }

    const isDuplicate = db.skills.some(
      (s) =>
        s.id !== editingSkill?.id &&
        normalize(s.name) === normalize(trimmed),
    );

    if (isDuplicate) {
      setFormError("Tên kỹ năng đã tồn tại. Vui lòng chọn tên khác.");
      return;
    }

    if (editingSkill) {
      // Update
      setDb((prev) => ({
        ...prev,
        skills: prev.skills.map((s) =>
          s.id === editingSkill.id ? { ...s, name: trimmed } : s,
        ),
      }));
      showToast("Đã cập nhật kỹ năng trong dữ liệu mẫu.");
    } else {
      // Create new
      const nextId =
        db.skills.length > 0
          ? Math.max(...db.skills.map((s) => s.id)) + 1
          : 1;
      const newSkill: AdminSkill = {
        id: nextId,
        name: trimmed,
        candidates_count: 0,
      };
      setDb((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill],
      }));
      // Reveal the new item
      setQuery(trimmed);
      setUsageFilter("all");
      setCurrentPage(1);
      showToast("Đã thêm kỹ năng trong dữ liệu mẫu.");
    }

    setIsEditOpen(false);
  };

  // Confirm delete skill (cascades unlinking from jobs)
  const handleConfirmDelete = () => {
    if (!deletingSkill) return;
    const skill = deletingSkill;

    setDb((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== skill.id),
      jobs: prev.jobs.map((job) => ({
        ...job,
        skills: job.skills.filter((id) => id !== skill.id),
      })),
    }));

    setDeletingSkill(null);
    showToast("Đã xóa kỹ năng trong dữ liệu mẫu.");
  };

  const deletingJobsCount = deletingSkill ? jobsCountFor(deletingSkill.id) : 0;
  const deletingCandidatesCount = deletingSkill ? deletingSkill.candidates_count || 0 : 0;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="ap-breadcrumb" aria-label="Vị trí trang">
        <House className="ap-icon" aria-hidden="true" />
        <Link href="/admin">Quản trị</Link>
        <span>/</span>
        <span>Danh mục kỹ năng</span>
      </nav>

      {/* Page Heading */}
      <div className="ap-page-heading">
        <div>
          <h1>Danh mục kỹ năng</h1>
          <p>Chuẩn hóa kỹ năng cho hồ sơ ứng viên và yêu cầu tuyển dụng.</p>
        </div>
        <button
          type="button"
          className="ap-button ap-button-primary"
          onClick={handleOpenCreate}
        >
          <Plus className="ap-icon" aria-hidden="true" />
          Thêm kỹ năng
        </button>
      </div>

      {/* Preview notification */}
      <div className="ap-preview">
        <Info className="ap-icon" aria-hidden="true" />
        <span>Dữ liệu minh họa · Thao tác chỉ áp dụng cho bản xem trước.</span>
        <button type="button" onClick={handleResetPreview}>
          Khôi phục mẫu
        </button>
      </div>

      {/* Info notice */}
      <div className="ap-notice">
        <Info className="ap-icon" aria-hidden="true" />
        <p>
          Xóa kỹ năng sẽ gỡ kỹ năng đó khỏi tin tuyển dụng và hồ sơ ứng viên liên quan.
          Nội dung tin và hồ sơ được giữ lại.
        </p>
      </div>

      {/* Panel */}
      <section className="ap-panel" aria-labelledby="listTitle">
        <div className="ap-panel-heading">
          <div>
            <h2 id="listTitle">Danh sách kỹ năng</h2>
            <p id="catalogSummary">
              {totalSkills} mục · {usedCount} đang được sử dụng · {unusedCount} chưa sử dụng
            </p>
          </div>
          <span className="ap-badge ap-badge-blue">Danh mục hệ thống</span>
        </div>

        {/* Toolbar Filters */}
        <form
          className="ap-toolbar"
          id="listFilters"
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Search Filter */}
          <label className="ap-filter ap-filter-search">
            <span>Tìm kiếm</span>
            <span className="ap-input-wrap">
              <Search className="ap-icon" aria-hidden="true" />
              <input
                id="listSearch"
                type="search"
                placeholder="Tìm tên kỹ năng…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                autoComplete="off"
              />
            </span>
          </label>

          {/* Usage Filter */}
          <label className="ap-filter">
            <span>Tình trạng sử dụng</span>
            <select
              id="listUsage"
              value={usageFilter}
              onChange={(e) => {
                setUsageFilter(e.target.value as "all" | "used" | "unused");
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="used">Đang được sử dụng</option>
              <option value="unused">Chưa được sử dụng</option>
            </select>
          </label>

          {/* Sort Filter */}
          <label className="ap-filter">
            <span>Sắp xếp</span>
            <select
              id="listSort"
              value={sortFilter}
              onChange={(e) => {
                setSortFilter(e.target.value as "name" | "usage" | "newest");
                setCurrentPage(1);
              }}
            >
              <option value="name">Tên A → Z</option>
              <option value="usage">Được dùng nhiều nhất</option>
              <option value="newest">Thêm gần đây</option>
            </select>
          </label>

          <button
            type="button"
            className="ap-clear"
            onClick={handleClearFilters}
          >
            Xóa bộ lọc
          </button>
        </form>

        {/* Table View */}
        {filteredSkills.length > 0 ? (
          <div className="ap-table-wrap" id="listTable">
            <table className="ap-table ap-table-responsive">
              <caption className="ap-sr-only">
                Danh mục kỹ năng và số liên kết sử dụng
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tên kỹ năng</th>
                  <th scope="col">Tin tuyển dụng</th>
                  <th scope="col">Hồ sơ ứng viên</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody id="listRows">
                {paginatedSkills.map((skill) => {
                  const jobCount = jobsCountFor(skill.id);
                  const candidateCount = skill.candidates_count || 0;

                  return (
                    <tr key={skill.id}>
                      <td>
                        <strong className="ap-cell-title">{skill.name}</strong>
                      </td>
                      <td data-label="Tin tuyển dụng" className="ap-number">
                        {formatNumber(jobCount)} tin
                      </td>
                      <td data-label="Hồ sơ ứng viên" className="ap-number">
                        {formatNumber(candidateCount)} hồ sơ
                      </td>
                      <td>
                        <div className="ap-actions">
                          <button
                            type="button"
                            className="ap-icon-button"
                            onClick={() => handleOpenEdit(skill)}
                            aria-label={`Sửa ${skill.name}`}
                          >
                            <Pencil className="ap-icon" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ap-icon-button"
                            onClick={() => setDeletingSkill(skill)}
                            aria-label={`Xóa ${skill.name}`}
                          >
                            <Trash2 className="ap-icon" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="ap-empty" id="listEmpty">
            <Search className="ap-icon" aria-hidden="true" />
            <h3>Không tìm thấy kết quả</h3>
            <p>Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách.</p>
            <button
              type="button"
              className="ap-button"
              onClick={handleClearFilters}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        {/* Table Footer & Pagination */}
        <div className="ap-table-footer">
          <span id="listCount" role="status" aria-live="polite" aria-atomic="true">
            {filteredSkills.length > 0
              ? `Hiển thị ${startIndex + 1}–${Math.min(
                  startIndex + PAGE_SIZE,
                  filteredSkills.length,
                )} trên ${formatNumber(filteredSkills.length)} mục`
              : "0 mục phù hợp"}
          </span>

          {totalPages > 1 && (
            <nav className="ap-pagination" id="listPagination" aria-label="Phân trang">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
              >
                <ChevronLeft className="ap-icon" aria-hidden="true" />
              </button>

              {Array.from({ length: totalPages }, (_, index) => {
                const pageNum = index + 1;
                const isCurrent = pageNum === safePage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    aria-current={isCurrent ? "page" : undefined}
                    aria-label={`Trang ${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
              >
                <ChevronRight className="ap-icon" aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* Modal 1: Create / Edit Skill                             */}
      {/* ======================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[480px] p-6" aria-describedby="edit-skill-desc">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingSkill ? "Sửa" : "Thêm"} kỹ năng
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSkill} className="space-y-4 pt-2">
            <p id="edit-skill-desc" className="text-xs text-[var(--ap-muted)]">
              Tên rõ ràng, nhất quán giúp việc tìm kiếm và phân loại chính xác hơn.
            </p>

            <label className="ap-field block" htmlFor="catalogName">
              <span className="text-xs font-semibold text-[var(--ap-navy)] block mb-1">
                Tên kỹ năng
              </span>
              <input
                id="catalogName"
                name="name"
                type="text"
                value={formName}
                maxLength={MAX_SKILL_LENGTH}
                required
                autoComplete="off"
                placeholder="Ví dụ: ReactJS, TypeScript, Docker…"
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full text-xs p-2.5 border border-[var(--ap-line)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--ap-blue)]"
              />
              <small className="text-[11px] text-[var(--ap-muted)] block mt-1">
                Bắt buộc · Tối đa {MAX_SKILL_LENGTH} ký tự.
              </small>
            </label>

            {formError && (
              <p className="ap-field-error text-xs text-red-600" role="alert">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--ap-line)]">
              <button
                type="button"
                className="ap-button"
                onClick={() => setIsEditOpen(false)}
              >
                Hủy
              </button>
              <button type="submit" className="ap-button ap-button-primary">
                Lưu vào bản xem trước
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* Modal 2: Delete Skill                                    */}
      {/* ======================================================== */}
      <Dialog
        open={!!deletingSkill}
        onOpenChange={(open) => !open && setDeletingSkill(null)}
      >
        <DialogContent className="max-w-[480px] p-6" aria-describedby="delete-skill-desc">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Xóa kỹ năng?
            </DialogTitle>
          </DialogHeader>

          {deletingSkill && (
            <div className="space-y-4 pt-2" id="delete-skill-desc">
              <p className="text-xs text-[var(--ap-text)]">
                Bạn muốn xóa <strong>{deletingSkill.name}</strong> khỏi danh mục?
              </p>

              {(deletingJobsCount > 0 || deletingCandidatesCount > 0) && (
                <div className="ap-notice ap-notice-amber">
                  <AlertTriangle className="ap-icon shrink-0 text-amber-600" aria-hidden="true" />
                  <p className="text-xs leading-relaxed">
                    Kỹ năng sẽ được gỡ khỏi <strong>{deletingJobsCount} tin tuyển dụng</strong> và{" "}
                    <strong>{deletingCandidatesCount} hồ sơ ứng viên</strong>. Tin và hồ sơ vẫn được
                    giữ lại.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-[var(--ap-muted)]">
                Thao tác này chỉ áp dụng cho dữ liệu minh họa.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--ap-line)]">
                <button
                  type="button"
                  className="ap-button"
                  onClick={() => setDeletingSkill(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="ap-button ap-button-danger"
                  onClick={handleConfirmDelete}
                >
                  Xóa khỏi danh mục
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[var(--ap-navy)] text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}

