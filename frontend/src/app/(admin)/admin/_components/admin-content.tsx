import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/services/auth-session";
import { authMockEnabled } from "@/services/auth-mode";
import { getInitialDatabase } from "@/features/admin/mock-data";
import { AdminLoading } from "@/components/admin/admin-loading";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminUsers } from "@/components/admin/admin-users";
import { AdminJobs } from "@/components/admin/admin-jobs";
import { AdminJobDetail } from "@/components/admin/admin-job-detail";
import { AdminCategories } from "@/components/admin/admin-categories";
import { AdminSkills } from "@/components/admin/admin-skills";

type AdminSection = "overview" | "users" | "jobs" | "categories" | "skills";
type AdminContentProps = {
  section: AdminSection;
  params?: Promise<{ id: string }>;
  legacyPreview?: boolean;
};

export function AdminUnavailable() {
  return (
    <main id="main" className="site-container page-content">
      <div className="surface empty-state" role="status">
        <h1>Dữ liệu quản trị chưa được kết nối</h1>
        <p>Vui lòng quay lại khi dịch vụ quản trị sẵn sàng.</p>
        <Link href="/account/security">Bảo mật tài khoản</Link>
      </div>
    </main>
  );
}

export function AdminContent(props: AdminContentProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ section, params, legacyPreview }: AdminContentProps) {
  const id = params ? (await params).id : undefined;
  const validId =
    id !== undefined &&
    /^[1-9]\d*$/.test(id) &&
    Number.isSafeInteger(Number(id));
  const returnTo =
    section === "overview"
      ? "/admin"
      : `/admin/${section}${validId ? `/${id}` : ""}`;
  // Layouts persist across navigation; each leaf revalidates the session.
  await requireUser("admin", returnTo);
  if (id !== undefined && !validId) notFound();
  if (legacyPreview) redirect(returnTo);
  // API outages/configuration must never expose fixtures or fake mutations.
  if (!authMockEnabled()) return <AdminUnavailable />;
  if (id !== undefined) {
    if (!getInitialDatabase().jobs.some((job) => job.id === Number(id)))
      notFound();
    return <AdminJobDetail jobId={Number(id)} />;
  }
  switch (section) {
    case "overview":
      return <AdminOverview />;
    case "users":
      return <AdminUsers />;
    case "jobs":
      return <AdminJobs />;
    case "categories":
      return <AdminCategories />;
    case "skills":
      return <AdminSkills />;
  }
}
