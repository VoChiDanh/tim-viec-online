import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { authMockEnabled } from "./auth-mode";
import { requireUser } from "./auth-session";
import { getJobRepository } from "./jobs";
import { createCandidateWorkspace } from "@/mocks/candidate-workspace";
import { createProfilePreview } from "@/mocks/candidate-profile";
import type { CandidateSection } from "@/features/candidate-workspace/types";

// Mock fixtures are private account data and never substitute for Laravel data.
export const getCandidatePreview = cache(async () => {
  const user = await requireUser("candidate");
  await connection();
  if (!authMockEnabled()) notFound();
  const { jobs, today } = await getJobRepository();
  return {
    ...createCandidateWorkspace(jobs, today),
    profile: { ...createProfilePreview(), name: user.name, email: user.email },
  };
});

export async function redirectCandidatePreview(
  section: CandidateSection,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) {
  await requireUser("candidate", `/account/${section}`);
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  redirect(`/account/${section}${query.size ? `?${query}` : ""}`);
}
