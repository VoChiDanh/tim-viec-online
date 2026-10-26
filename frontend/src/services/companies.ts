import "server-only";
import { cache } from "react";
import { getJobRepository } from "./jobs";
import { createCompanyProfiles } from "../mocks/companies";
import { companyOpenJobs } from "../features/companies/query";
import { authApiEnabled } from "./auth-mode";
import { backendRequest } from "./backend-api";
import { mapCompanyProfile, mapJob, record } from "@/features/jobs/api";
import { ApiError } from "@/features/api/types";

// Replace this read adapter with GET /api/companies when Laravel is ready.
const repository = cache(async () => {
  const { jobs, today } = await getJobRepository();
  return { companies: createCompanyProfiles(jobs, today), jobs, today };
});

export async function getCompany(id: string | number) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
    return null;
  if (authApiEnabled()) {
    try { return mapCompanyProfile((await backendRequest<unknown>(`/companies/${id}`, {}, false)).data); }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  }
  const { companies } = await repository();
  return companies.find((company) => company.id === Number(id)) ?? null;
}

export async function getCompanyJobs(id: number) {
  if (authApiEnabled()) {
    const company = record((await backendRequest<unknown>(`/companies/${id}`, {}, false)).data);
    const rows = Array.isArray(company.jobs) ? company.jobs : [];
    // Nested jobs may omit their parent company to avoid recursive resources.
    return rows.map(value => mapJob({ ...record(value), company })).filter(job => job.status === "active");
  }
  const { jobs, today } = await repository();
  return companyOpenJobs(jobs, id, today);
}
