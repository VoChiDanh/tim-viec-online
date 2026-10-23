import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminOverview } from "@/components/admin/admin-overview";

export const metadata: Metadata = {
  title: "Xem trước tổng quan hệ thống | Quản trị TimViecOnline",
  robots: { index: false },
};

export default function AdminPreviewPage() {
  return (
    <AdminShell reportedCount={3}>
      <AdminOverview />
    </AdminShell>
  );
}

