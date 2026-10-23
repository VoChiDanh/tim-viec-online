import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUsers } from "@/components/admin/admin-users";

export const metadata: Metadata = {
  title: "Xem trước tài khoản người dùng | Quản trị TimViecOnline",
  robots: { index: false },
};

export default function AdminUsersPreviewPage() {
  return (
    <AdminShell reportedCount={3}>
      <AdminUsers />
    </AdminShell>
  );
}

