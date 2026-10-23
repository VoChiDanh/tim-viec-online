import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/services/auth-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminLoading } from "@/components/admin/admin-loading";

export const metadata: Metadata = {
  title: "Tổng quan hệ thống | Quản trị TimViecOnline",
  description: "Theo dõi hoạt động tuyển dụng và những nội dung cần xử lý.",
  robots: { index: false },
};

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  await requireUser("admin", "/admin");

  return (
    <AdminShell reportedCount={3}>
      <AdminOverview />
    </AdminShell>
  );
}
