import "server-only";
import { cache } from "react";
import { getJobRepository } from "./jobs";
import { createCompanyProfiles } from "../mocks/companies";
import { companyOpenJobs } from "../features/companies/query";

// Replace this read adapter with GET /api/companies when Laravel is ready.
const repository = cache(async () => {
  const { jobs, today } = await getJobRepository();
  return { companies: createCompanyProfiles(jobs, today), jobs, today };
});

export async function getCompany(id: string | number) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
    return null;
  const { companies } = await repository();
  return companies.find((company) => company.id === Number(id)) ?? null;
}

export async function getCompanyJobs(id: number) {
  const { jobs, today } = await repository();
  return companyOpenJobs(jobs, id, today);
}
