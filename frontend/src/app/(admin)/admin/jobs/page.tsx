import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/services/auth-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminJobs } from "@/components/admin/admin-jobs";
import { AdminLoading } from "@/components/admin/admin-loading";

export const metadata: Metadata = {
  title: "Kiểm duyệt tin tuyển dụng | Quản trị TimViecOnline",
  description: "Kiểm tra nội dung bị báo cáo và xử lý tin vi phạm chính sách.",
  robots: { index: false },
};

export default function AdminJobsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminJobsContent />
    </Suspense>
  );
}

async function AdminJobsContent() {
  await requireUser("admin", "/admin/jobs");

  return (
    <AdminShell reportedCount={3}>
      <AdminJobs />
    </AdminShell>
  );
}

