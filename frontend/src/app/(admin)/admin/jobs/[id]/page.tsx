import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/services/auth-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminJobDetail } from "@/components/admin/admin-job-detail";
import { AdminLoading } from "@/components/admin/admin-loading";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = {
  title: "Chi tiết kiểm duyệt | Quản trị TimViecOnline",
  description: "Đọc toàn bộ nội dung và thông tin liên quan trước khi xử lý.",
  robots: { index: false },
};

export default function AdminJobDetailPage({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminJobDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminJobDetailContent({ params, searchParams }: PageProps) {
  const { id } = await params;
  const search = await searchParams;
  const isPreview = search.preview === "1" || search.preview === "true";

  if (!isPreview) {
    await requireUser("admin", `/admin/jobs/${id}`);
  }

  return (
    <AdminShell reportedCount={3}>
      <AdminJobDetail jobId={id} preview={isPreview} />
    </AdminShell>
  );
}

