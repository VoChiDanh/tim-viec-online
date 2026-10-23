import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/services/auth-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCategories } from "@/components/admin/admin-categories";
import { AdminLoading } from "@/components/admin/admin-loading";

export const metadata: Metadata = {
  title: "Danh mục ngành nghề | Quản trị TimViecOnline",
  description: "Tổ chức ngành nghề để ứng viên tìm được công việc phù hợp.",
  robots: { index: false },
};

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminCategoriesContent />
    </Suspense>
  );
}

async function AdminCategoriesContent() {
  await requireUser("admin", "/admin/categories");

  return (
    <AdminShell reportedCount={3}>
      <AdminCategories />
    </AdminShell>
  );
}

