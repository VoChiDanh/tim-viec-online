import "server-only";
import { cache } from "react";
import { requireUser } from "./auth-session";
import { authMockEnabled } from "./auth-mode";
import { getInitialDatabase } from "@/mocks/admin";

// Like getEmployerData: the single protected replacement point for Laravel reads.
// No endpoint is assumed until the admin API contract is agreed with backend.
export const getAdminData = cache(async () => {
  await requireUser("admin");
  if (!authMockEnabled()) return null;
  return getInitialDatabase();
});

// Detail lookup stays behind the adapter: a paginated backend list must not
// decide that an otherwise valid detail ID does not exist.
export const getAdminJob = cache(async (id: number) => {
  const data = await getAdminData();
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return data?.jobs.find((job) => job.id === id) ?? null;
});
