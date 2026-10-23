import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminJobs } from "@/components/admin/admin-jobs";
import { AdminLoading } from "@/components/admin/admin-loading";

export const metadata: Metadata = {
  title: "Xem trước kiểm duyệt tin tuyển dụng | Quản trị TimViecOnline",
  robots: { index: false },
};

export default function AdminJobsPreviewPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell reportedCount={3}>
        <AdminJobs />
      </AdminShell>
    </Suspense>
  );
}

