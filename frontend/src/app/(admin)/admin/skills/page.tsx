import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/services/auth-session";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSkills } from "@/components/admin/admin-skills";
import { AdminLoading } from "@/components/admin/admin-loading";

export const metadata: Metadata = {
  title: "Danh mục kỹ năng | Quản trị TimViecOnline",
  description: "Chuẩn hóa kỹ năng cho hồ sơ ứng viên và yêu cầu tuyển dụng.",
  robots: { index: false },
};

export default function AdminSkillsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminSkillsContent />
    </Suspense>
  );
}

async function AdminSkillsContent() {
  await requireUser("admin", "/admin/skills");

  return (
    <AdminShell reportedCount={3}>
      <AdminSkills />
    </AdminShell>
  );
}

