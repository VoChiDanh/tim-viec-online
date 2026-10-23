import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminJobDetail } from "@/components/admin/admin-job-detail";
import { AdminLoading } from "@/components/admin/admin-loading";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Xem trước chi tiết kiểm duyệt | Quản trị TimViecOnline",
  robots: { index: false },
};

export default function AdminJobDetailPreviewPage({ params }: PageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminJobDetailPreviewContent params={params} />
    </Suspense>
  );
}

async function AdminJobDetailPreviewContent({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell reportedCount={3}>
      <AdminJobDetail jobId={id} preview={true} />
    </AdminShell>
  );
}

