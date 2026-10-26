import type { ApiResponse } from "@/features/api/types";
import type {
  AdminCompany,
  AdminDatabase,
  AdminJob,
  AdminStats,
  AdminUser,
} from "./types";

export type AdminRequest = <T>(
  path: string,
  init?: RequestInit,
) => Promise<ApiResponse<T>>;
export type AdminJobDto = Omit<AdminJob, "skills"> & {
  is_expired?: boolean;
  skills?: { id: number; name: string }[];
  company?: AdminCompany;
};
type UserDto = AdminUser & { company?: AdminCompany | null };

export function mapAdminJob(dto: AdminJobDto): AdminJob {
  return {
    ...dto,
    status: dto.status === "active" && dto.is_expired ? "expired" : dto.status,
    skills: (dto.skills ?? []).map((skill) => skill.id),
    created_at: dto.created_at?.slice(0, 10) ?? "",
  };
}

/** Exhaust every backend page; never treat the first page as the full workspace. */
export async function readAdminPages<T>(
  request: AdminRequest,
  path: string,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const response = await request<T[]>(
      `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
    );
    if (!Array.isArray(response.data))
      throw new Error("Dữ liệu quản trị không hợp lệ.");
    rows.push(...response.data);
    lastPage = Number(response.meta?.last_page ?? 1);
    if (!Number.isSafeInteger(lastPage) || lastPage < page)
      throw new Error("Phân trang quản trị không hợp lệ.");
    page++;
  } while (page <= lastPage);
  return rows;
}

export async function readAdminDatabase(
  request: AdminRequest,
): Promise<AdminDatabase> {
  const [users, jobs, categories, skills, stats] = await Promise.all([
    readAdminPages<UserDto>(request, "/admin/users"),
    readAdminPages<AdminJobDto>(request, "/admin/jobs"),
    readAdminPages<AdminDatabase["categories"][number]>(
      request,
      "/admin/categories",
    ),
    readAdminPages<
      AdminDatabase["skills"][number] & { candidate_profiles_count?: number }
    >(request, "/admin/skills"),
    request<AdminStats>("/admin/stats?days=14"),
  ]);
  const companies = new Map<number, AdminCompany>();
  for (const user of users) {
    if (user.company)
      companies.set(user.company.id, { ...user.company, user_id: user.id });
  }
  for (const job of jobs) {
    if (job.company && !companies.has(job.company.id))
      companies.set(job.company.id, job.company);
  }
  return {
    users: users.map((user) => ({
      ...user,
      phone: user.phone ?? "",
      created_at: user.created_at?.slice(0, 10) ?? "",
    })),
    companies: [...companies.values()],
    jobs: jobs.map(mapAdminJob),
    categories,
    skills: skills.map((skill) => ({
      ...skill,
      candidates_count:
        skill.candidate_profiles_count ?? skill.candidates_count ?? 0,
    })),
    applications: [],
    stats: stats.data,
  };
}
