import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/services/auth-session";
import { authMockEnabled } from "@/services/auth-mode";
import { getInitialDatabase } from "@/features/admin/mock-data";
import { AdminProvider } from "@/components/admin/admin-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminLoading } from "@/components/admin/admin-loading";
import { SiteFooter } from "@/components/layout/site-footer";
import { AdminUnavailable } from "./_components/admin-content";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<AdminLoading />}>
        <AdminSession>{children}</AdminSession>
      </Suspense>
      <SiteFooter />
    </>
  );
}

async function AdminSession({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  // Let the leaf guard preserve its exact login destination for guests.
  if (user?.role !== "admin") return children;
  if (!authMockEnabled()) return <AdminUnavailable />;
  return (
    <AdminProvider key={user.id} initial={getInitialDatabase()}>
      <AdminShell user={user}>{children}</AdminShell>
    </AdminProvider>
  );
}
