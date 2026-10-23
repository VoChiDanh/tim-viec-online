"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
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
import type { AdminCategory, AdminDatabase } from "@/features/admin/types";
import "./admin.css";

const PAGE_SIZE = 6;
const MAX_CATEGORY_LENGTH = 150;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function AdminCategories() {
  const [db, setDb] = useState<AdminDatabase>(() => getInitialDatabase());
  const [query, setQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | "used" | "unused">("all");
  const [sortFilter, setSortFilter] = useState<"name" | "usage" | "newest">("name");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null);

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
    setDeletingCategory(null);
    showToast("Đã khôi phục dữ liệu mẫu ban đầu.");
  };

  // Helper count jobs for a category
  const jobsCountFor = (categoryId: number): number => {
    return db.jobs.filter((j) => j.category_id === categoryId).length;
  };

  // Metrics summary
  const totalCategories = db.categories.length;
  const usedCount = useMemo(
    () => db.categories.filter((c) => jobsCountFor(c.id) > 0).length,
    [db.categories, db.jobs],
  );
  const unusedCount = totalCategories - usedCount;

  // Filtered rows
  const filteredCategories = useMemo(() => {
    const q = normalize(query);
    return db.categories
      .filter((cat) => {
        const matchesQuery = !q || normalize(cat.name).includes(q);
        const count = jobsCountFor(cat.id);
        const matchesUsage =
          usageFilter === "all" ||
          (usageFilter === "used" ? count > 0 : count === 0);
        return matchesQuery && matchesUsage;
      })
      .sort((a, b) => {
        if (sortFilter === "name") {
          return a.name.localeCompare(b.name, "vi");
        }
        if (sortFilter === "usage") {
          const countA = jobsCountFor(a.id);
          const countB = jobsCountFor(b.id);
          return countB - countA || a.name.localeCompare(b.name, "vi");
        }
        // newest
        return b.id - a.id;
      });
  }, [db.categories, db.jobs, query, usageFilter, sortFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedCategories = useMemo(
    () => filteredCategories.slice(startIndex, startIndex + PAGE_SIZE),
    [filteredCategories, startIndex],
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
    setEditingCategory(null);
    setFormName("");
    setFormError(null);
    setIsEditOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (category: AdminCategory) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormError(null);
    setIsEditOpen(true);
  };

  // Save (Create or Update) Category
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim().replace(/\s+/g, " ");

    if (!trimmed) {
      setFormError("Vui lòng nhập tên ngành nghề.");
      return;
    }

    if (trimmed.length > MAX_CATEGORY_LENGTH) {
      setFormError(`Tên không được vượt quá ${MAX_CATEGORY_LENGTH} ký tự.`);
      return;
    }

    const isDuplicate = db.categories.some(
      (c) =>
        c.id !== editingCategory?.id &&
        normalize(c.name) === normalize(trimmed),
    );

    if (isDuplicate) {
      setFormError("Tên ngành nghề đã tồn tại. Vui lòng chọn tên khác.");
      return;
    }

    if (editingCategory) {
      // Update
      setDb((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === editingCategory.id ? { ...c, name: trimmed } : c,
        ),
      }));
      showToast("Đã cập nhật ngành nghề trong dữ liệu mẫu.");
    } else {
      // Create new
      const nextId =
        db.categories.length > 0
          ? Math.max(...db.categories.map((c) => c.id)) + 1
          : 1;
      const newCat: AdminCategory = { id: nextId, name: trimmed };
      setDb((prev) => ({
        ...prev,
        categories: [...prev.categories, newCat],
      }));
      // Reveal the new item
      setQuery(trimmed);
      setUsageFilter("all");
      setCurrentPage(1);
      showToast("Đã thêm ngành nghề trong dữ liệu mẫu.");
    }

    setIsEditOpen(false);
  };

  // Confirm delete category
  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    const cat = deletingCategory;
    const count = jobsCountFor(cat.id);

    if (count > 0) return; // Prevent deleting used category

    setDb((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== cat.id),
    }));

    setDeletingCategory(null);
    showToast("Đã xóa ngành nghề trong dữ liệu mẫu.");
  };

  const deletingJobsCount = deletingCategory ? jobsCountFor(deletingCategory.id) : 0;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="ap-breadcrumb" aria-label="Vị trí trang">
        <House className="ap-icon" aria-hidden="true" />
        <Link href="/admin">Quản trị</Link>
        <span>/</span>
        <span>Danh mục ngành nghề</span>
      </nav>

      {/* Page Heading */}
      <div className="ap-page-heading">
        <div>
          <h1>Danh mục ngành nghề</h1>
          <p>Tổ chức ngành nghề để ứng viên tìm được công việc phù hợp.</p>
        </div>
        <button
          type="button"
          className="ap-button ap-button-primary"
          onClick={handleOpenCreate}
        >
          <Plus className="ap-icon" aria-hidden="true" />
          Thêm ngành nghề
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
          Ngành nghề đang có tin tuyển dụng cần được giữ lại. Bạn có thể sửa tên để
          làm rõ cách phân loại.
        </p>
      </div>

      {/* Panel */}
      <section className="ap-panel" aria-labelledby="listTitle">
        <div className="ap-panel-heading">
          <div>
            <h2 id="listTitle">Danh sách ngành nghề</h2>
            <p id="catalogSummary">
              {totalCategories} mục · {usedCount} đang được sử dụng · {unusedCount} chưa sử dụng
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
                placeholder="Tìm tên ngành nghề…"
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
        {filteredCategories.length > 0 ? (
          <div className="ap-table-wrap" id="listTable">
            <table className="ap-table ap-table-responsive">
              <caption className="ap-sr-only">
                Danh mục ngành nghề và số tin tuyển dụng liên quan
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tên ngành nghề</th>
                  <th scope="col">Tin tuyển dụng</th>
                  <th scope="col">Tình trạng sử dụng</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody id="listRows">
                {paginatedCategories.map((cat) => {
                  const count = jobsCountFor(cat.id);
                  const isUsed = count > 0;

                  return (
                    <tr key={cat.id}>
                      <td>
                        <strong className="ap-cell-title">{cat.name}</strong>
                      </td>
                      <td data-label="Tin tuyển dụng" className="ap-number">
                        {formatNumber(count)} tin
                      </td>
                      <td data-label="Tình trạng sử dụng">
                        {isUsed ? (
                          <span className="ap-badge ap-badge-green">Đang sử dụng</span>
                        ) : (
                          <span className="ap-badge">Chưa sử dụng</span>
                        )}
                      </td>
                      <td>
                        <div className="ap-actions">
                          <button
                            type="button"
                            className="ap-icon-button"
                            onClick={() => handleOpenEdit(cat)}
                            aria-label={`Sửa ${cat.name}`}
                          >
                            <Pencil className="ap-icon" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ap-icon-button"
                            onClick={() => setDeletingCategory(cat)}
                            aria-label={`Xóa ${cat.name}`}
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
            {filteredCategories.length > 0
              ? `Hiển thị ${startIndex + 1}–${Math.min(
                  startIndex + PAGE_SIZE,
                  filteredCategories.length,
                )} trên ${formatNumber(filteredCategories.length)} mục`
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
      {/* Modal 1: Create / Edit Category                          */}
      {/* ======================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[480px] p-6" aria-describedby="edit-cat-desc">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingCategory ? "Sửa" : "Thêm"} ngành nghề
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
            <p id="edit-cat-desc" className="text-xs text-[var(--ap-muted)]">
              Tên rõ ràng, nhất quán giúp việc tìm kiếm và phân loại chính xác hơn.
            </p>

            <label className="ap-field block" htmlFor="catalogName">
              <span className="text-xs font-semibold text-[var(--ap-navy)] block mb-1">
                Tên ngành nghề
              </span>
              <input
                id="catalogName"
                name="name"
                type="text"
                value={formName}
                maxLength={MAX_CATEGORY_LENGTH}
                required
                autoComplete="off"
                placeholder="Ví dụ: Công nghệ thông tin / Phần mềm"
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full text-xs p-2.5 border border-[var(--ap-line)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--ap-blue)]"
              />
              <small className="text-[11px] text-[var(--ap-muted)] block mt-1">
                Bắt buộc · Tối đa {MAX_CATEGORY_LENGTH} ký tự.
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
      {/* Modal 2: Delete Category                                 */}
      {/* ======================================================== */}
      <Dialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <DialogContent className="max-w-[480px] p-6" aria-describedby="delete-cat-desc">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {deletingJobsCount > 0
                ? "Ngành nghề đang được sử dụng"
                : "Xóa ngành nghề?"}
            </DialogTitle>
          </DialogHeader>

          {deletingCategory && (
            <div className="space-y-4 pt-2" id="delete-cat-desc">
              {deletingJobsCount > 0 ? (
                /* Cannot delete when in use */
                <>
                  <div className="ap-notice ap-notice-amber">
                    <AlertCircle className="ap-icon shrink-0 text-amber-600" aria-hidden="true" />
                    <p className="text-xs leading-relaxed">
                      <strong>{deletingCategory.name}</strong> đang có {deletingJobsCount} tin tuyển dụng.
                      Hãy chuyển các tin sang ngành nghề phù hợp trước khi xóa.
                    </p>
                  </div>
                  <p className="text-xs text-[var(--ap-muted)]">
                    Bạn vẫn có thể sửa tên ngành nghề trong danh sách.
                  </p>
                  <div className="flex justify-end pt-3 border-t border-[var(--ap-line)]">
                    <button
                      type="button"
                      className="ap-button"
                      onClick={() => setDeletingCategory(null)}
                    >
                      Đóng
                    </button>
                  </div>
                </>
              ) : (
                /* Can delete when unused */
                <>
                  <p className="text-xs text-[var(--ap-text)]">
                    Bạn muốn xóa <strong>{deletingCategory.name}</strong> khỏi danh mục?
                  </p>
                  <p className="text-[11px] text-[var(--ap-muted)]">
                    Thao tác này chỉ áp dụng cho dữ liệu minh họa.
                  </p>
                  <div className="flex justify-end gap-2 pt-3 border-t border-[var(--ap-line)]">
                    <button
                      type="button"
                      className="ap-button"
                      onClick={() => setDeletingCategory(null)}
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
                </>
              )}
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

