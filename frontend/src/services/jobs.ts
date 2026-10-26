import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import {
  formatSalary,
  isJobOpen,
  vietnamToday,
} from "../features/jobs/formatters";
import { filterJobs, paginateJobs } from "../features/jobs/query";
import { JOB_LEVELS, type Job, type JobQuery } from "../features/jobs/types";
import { createJobFixtures, JOB_CATEGORIES } from "../mocks/jobs";
import {
  createHomeJobFixtures,
  HOME_CATEGORIES,
  HOME_COMPANIES,
  HOME_FEATURED,
} from "../mocks/home";
import type { HomeJobCard } from "../features/home/types";
import { getProvinceNames } from "./locations";

// Components depend on this read interface. Replace its fixture implementation
// with the agreed Laravel API adapter when endpoints are available.
export const getJobRepository = cache(async () => {
  await connection();
  const now = new Date();
  return {
    jobs: [...createJobFixtures(now), ...createHomeJobFixtures(now)],
    today: vietnamToday(now),
  };
});

export async function getHomeContent() {
  const { jobs, today } = await getJobRepository();
  const active = jobs.filter((job) => isJobOpen(job, today));
  const featuredIds = new Set(HOME_FEATURED.map((job) => job.id));
  const ordered = [
    ...HOME_FEATURED.flatMap((spec) =>
      active.filter((job) => job.id === spec.id),
    ),
    ...active.filter((job) => !featuredIds.has(job.id)),
  ];
  const cards: HomeJobCard[] = ordered.map((job) => {
    const presentation = HOME_FEATURED.find((spec) => spec.id === job.id);
    return {
      id: job.id,
      title: job.title,
      company: job.company.name,
      salary: formatSalary(job),
      city: job.city,
      mark:
        presentation?.mark ??
        job.company.name
          .split(" ")
          .map((word) => word[0])
          .slice(0, 3)
          .join(""),
      brand: presentation?.brand ?? "generic",
      featured: !!presentation,
    };
  });
  return {
    jobs: cards,
    categories: HOME_CATEGORIES,
    companies: HOME_COMPANIES.map((company) => ({
      ...company,
      count: active.filter((job) => job.company_id === company.id).length,
    })),
  };
}

export async function listJobs(query: JobQuery) {
  const { jobs, today } = await getJobRepository();
  return paginateJobs(filterJobs(jobs, query, today), query.page);
}

export async function getJob(id: string | number): Promise<Job | null> {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
    return null;
  const { jobs } = await getJobRepository();
  return jobs.find((job) => job.id === Number(id)) ?? null;
}

export async function getJobCatalog() {
  return {
    categories: JOB_CATEGORIES,
    cities: await getProvinceNames(),
    levels: [...JOB_LEVELS],
  };
}

export async function findRelatedJobs(job: Job, limit = 3): Promise<Job[]> {
  const { jobs, today } = await getJobRepository();
  const count = Number.isSafeInteger(limit) && limit > 0 ? limit : 3;
  return jobs
    .filter(
      (candidate) =>
        candidate.id !== job.id &&
        candidate.category_id === job.category_id &&
        isJobOpen(candidate, today),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id)
    .slice(0, count);
}
