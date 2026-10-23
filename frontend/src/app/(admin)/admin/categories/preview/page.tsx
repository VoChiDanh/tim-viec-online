import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminCategories } from "@/components/admin/admin-categories";
import { AdminLoading } from "@/components/admin/admin-loading";

export const metadata: Metadata = {
  title: "Xem trước danh mục ngành nghề | Quản trị TimViecOnline",
  robots: { index: false },
};

export default function AdminCategoriesPreviewPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell reportedCount={3}>
        <AdminCategories />
      </AdminShell>
    </Suspense>
  );
}

