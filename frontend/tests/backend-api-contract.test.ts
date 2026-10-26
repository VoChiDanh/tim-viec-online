import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedBackendPath } from "../src/features/api/paths";
import { collectPages } from "../src/features/api/pagination";
import { backendJobQuery, mapJob } from "../src/features/jobs/api";

test("proxy accepts only known methods/resources and never AI, auth credentials or arbitrary URLs", () => {
  for (const path of ["https://evil.test/jobs", "//evil.test/jobs", "/jobs/../user", "/jobs/%2e%2e/user", "/user", "/login", "/applications/1/ai-analyze", "/jobs/1#foo", "/jobs/1\\evil"]) {
    assert.equal(allowedBackendPath(path, "GET"), false, path);
  }
  assert.equal(allowedBackendPath("/applications/1/cv"), true);
  assert.equal(allowedBackendPath("/candidate/profile", "POST"), true);
  assert.equal(allowedBackendPath("/categories", "DELETE"), false);
});

test("collection follows every page and respects notification page limits", async () => {
  const visited: string[] = [];
  const rows = await collectPages<number>("/notifications", async path => {
    visited.push(path);
    const page = Number(new URL(path, "http://test").searchParams.get("page"));
    return { success: true, data: [page], pagination: { last_page: 3 } };
  });
  assert.deepEqual(rows, [1, 2, 3]);
  assert.ok(visited.every(path => path.includes("per_page=50")));
  await assert.rejects(collectPages("/jobs", async () => ({ success: true, data: [], meta: { last_page: 2 } })));
});

test("public job adapter maps backend amounts and never invents records", () => {
  const dto = { id: 8, company_id: 3, category_id: 2, title: "PHP Developer", job_type: "full_time", salary_min: "12000000", salary_max: null,
    company: { id: 3, name: "Real company" }, skills: [] };
  const job = mapJob(dto);
  assert.equal(job.company.name, "Real company");
  assert.equal(job.salary_min, 12000000);
  assert.equal(job.salary_max, null);
  assert.throws(() => mapJob({}));
  const query = backendJobQuery({ keyword: "PHP", category_ids: [2, 4], city: "", salary: "over20", level: "Senior", job_type: "", page: 3, sort: "salary_desc" });
  assert.ok(query.includes("category_id=2%2C4"));
  assert.ok(query.includes("salary_range=above_20m"));
  assert.ok(query.includes("level=Senior"));
});
