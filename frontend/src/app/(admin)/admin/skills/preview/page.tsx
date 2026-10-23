import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSkills } from "@/components/admin/admin-skills";
import { AdminLoading } from "@/components/admin/admin-loading";

export const metadata: Metadata = {
  title: "Xem trước danh mục kỹ năng | Quản trị TimViecOnline",
  robots: { index: false },
};

export default function AdminSkillsPreviewPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell reportedCount={3}>
        <AdminSkills />
      </AdminShell>
    </Suspense>
  );
}

