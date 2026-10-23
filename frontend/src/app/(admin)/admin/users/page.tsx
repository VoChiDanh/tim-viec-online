import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/services/auth-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUsers } from "@/components/admin/admin-users";
import { AdminLoading } from "@/components/admin/admin-loading";

export const metadata: Metadata = {
  title: "Tài khoản người dùng | Quản trị TimViecOnline",
  description: "Tra cứu thành viên và quản lý quyền truy cập nền tảng.",
  robots: { index: false },
};

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminUsersContent />
    </Suspense>
  );
}

async function AdminUsersContent() {
  await requireUser("admin", "/admin/users");

  return (
    <AdminShell reportedCount={3}>
      <AdminUsers />
    </AdminShell>
  );
}

