// Test-only HTTP contract fixture. This is not a Laravel backend or an auth mode.
import { createServer } from "node:http";

const revokedTokens = new Set();
let loginRequests = 0;
const requestCounts = {};
let heldPaths = new Set();
const waiting = new Map();
const identities = {
  "candidate@example.test": {
    id: 1,
    name: "Nguyễn Minh Anh",
    role: "candidate",
  },
  "employer@example.test": { id: 2, name: "Trần Hoàng Nam", role: "employer" },
  "admin@example.test": { id: 3, name: "Quản trị viên", role: "admin" },
  "unsupported@example.test": {
    id: 4,
    name: "Unknown role",
    role: "superuser",
  },
};

// Minimal contract records keep auth tests independent of production/mock seeds.
const company = {
  id: 1,
  name: "Auth contract company",
  city: "Hà Nội",
  address: "",
  description: "",
  company_size: "",
  website: null,
  active_jobs_count: 1,
};
const job = {
  id: 1,
  company_id: 1,
  category_id: 1,
  title: "Auth contract job",
  job_level: "Junior",
  quantity: 1,
  description: "Contract job description",
  requirements: "Contract requirements",
  benefits: "Contract benefits",
  salary_min: null,
  salary_max: null,
  is_negotiable: true,
  job_type: "full_time",
  city: "Hà Nội",
  address: "",
  deadline: "2099-12-31",
  status: "active",
  is_reported: false,
  created_at: "2026-10-26",
  updated_at: "2026-10-26",
  skills: [],
  company,
  applications_count: 0,
};

function sendList(response, data = []) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(
    JSON.stringify({
      success: true,
      data,
      meta: {
        current_page: 1,
        page: 1,
        per_page: 100,
        total: data.length,
        last_page: 1,
      },
    }),
  );
}

function sendVoid(response) {
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify({ success: true, message: "OK" }));
}

function send(response, status, data = null, code, errors) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(
    JSON.stringify({
      success: status < 400,
      message: status < 400 ? "OK" : "Request rejected",
      data,
      ...(code ? { code } : {}),
      ...(errors ? { errors } : {}),
    }),
  );
}

async function readBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 16_384) throw new Error("body_too_large");
  }
  return JSON.parse(raw || "{}");
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url || "/", "http://127.0.0.1").pathname.replace(
    /^\/api\/auth\//,
    "/api/",
  );
  const token = request.headers.authorization?.replace(/^Bearer /, "");
  if (path === "/health") return send(response, 200);
  if (path === "/__test__/stats")
    return send(response, 200, {
      loginRequests,
      requests: requestCounts,
      waiting: [...waiting.keys()],
    });
  if (path === "/__test__/hold" && request.method === "POST") {
    const body = await readBody(request);
    heldPaths = new Set(body.paths ?? []);
    for (const [key, callbacks] of waiting) {
      if (!heldPaths.has(key)) {
        waiting.delete(key);
        callbacks.forEach((release) => release());
      }
    }
    return sendVoid(response);
  }
  requestCounts[path] = (requestCounts[path] ?? 0) + 1;
  if (heldPaths.has(path)) {
    await new Promise((resolve) => {
      waiting.set(path, [...(waiting.get(path) ?? []), resolve]);
    });
  }
  if (request.method === "GET" && path === "/api/user") {
    const entry = Object.entries(identities).find(
      ([, user]) => token === `test-${user.role}-token`,
    );
    if (!entry || revokedTokens.has(token))
      return send(response, 401, null, "unauthenticated");
    return send(response, 200, {
      ...entry[1],
      email: entry[0],
      status: "active",
    });
  }
  if (request.method === "GET") {
    if (path === "/api/jobs") return sendList(response, [job]);
    if (path === "/api/jobs/1") return send(response, 200, job);
    if (path === "/api/categories")
      return sendList(response, [
        { id: 1, name: "Contract category", jobs_count: 1 },
      ]);
    if (path === "/api/skills") return sendList(response);
    if (path === "/api/companies") return sendList(response, [company]);
    if (path === "/api/companies/1")
      return send(response, 200, { ...company, jobs: [job] });
    if (path === "/api/locations/cities")
      return send(response, 200, ["Hà Nội"]);
    const entry = Object.entries(identities).find(
      ([, user]) => token === `test-${user.role}-token`,
    );
    if (!entry || revokedTokens.has(token))
      return send(response, 401, null, "unauthenticated");
    if (
      (path.startsWith("/api/admin/") && entry[1].role !== "admin") ||
      (path.startsWith("/api/employer/") && entry[1].role !== "employer") ||
      (path.startsWith("/api/candidate/") && entry[1].role !== "candidate")
    )
      return send(response, 403, null, "forbidden");
    if (path === "/api/workspace/bootstrap") {
      const role = entry[1].role;
      const stats = {
        users_count: 3,
        total_candidates: 1,
        total_employers: 1,
        total_jobs: 1,
        active_jobs: 1,
        total_applications: 0,
        reported_jobs: 0,
        trends: [],
      };
      const user = {
        ...entry[1],
        email: entry[0],
        status: "active",
        phone: "",
        dob: "2000-05-20",
      };
      if (role === "admin") {
        const summary = Object.fromEntries(
          Object.entries(job).filter(
            ([key]) =>
              !["description", "requirements", "benefits", "company"].includes(
                key,
              ),
          ),
        );
        return send(response, 200, {
          role,
          stats,
          users: [
            {
              ...identities["employer@example.test"],
              email: "employer@example.test",
              status: "active",
              company: { ...company, user_id: 2 },
            },
            user,
          ],
          jobs: [summary],
          categories: [{ id: 1, name: "Contract category" }],
          skills: [],
        });
      }
      if (role === "employer")
        return send(response, 200, {
          role,
          company: { ...company, user_id: 2 },
          jobs: [job],
          applications: [],
          conversations: [],
          notifications: [],
          categories: [{ id: 1, name: "Contract category" }],
          skills: [],
        });
      return send(response, 200, {
        role,
        profile: {
          user,
          profile: {
            title: "",
            city: "",
            address: "",
            bio: "",
            experience_years: 0,
            skills: [],
            cv_url: null,
            avatar_url: null,
            social_links: {},
          },
        },
        skills: [],
        saved_jobs: [],
        applications: [],
        conversations: [],
        notifications: [],
        conversation_jobs: [],
      });
    }
    if (path === "/api/candidate/profile")
      return send(response, 200, {
        user: {
          ...entry[1],
          email: entry[0],
          status: "active",
          dob: "2000-05-20",
          phone: "",
        },
        profile: {
          title: "",
          city: "",
          address: "",
          bio: "",
          experience_years: 0,
          skills: [],
          cv_url: null,
          avatar_url: null,
          social_links: {},
        },
      });
    if (path === "/api/employer/company")
      return send(response, 200, { ...company, user_id: 2 });
    if (path === "/api/admin/stats")
      return send(response, 200, {
        users_count: 0,
        total_candidates: 0,
        total_employers: 0,
        total_jobs: 0,
        active_jobs: 0,
        total_applications: 0,
        reported_jobs: 0,
        trends: [],
      });
    if (path === "/api/admin/jobs/1") return send(response, 200, job);
    if (
      [
        "/api/candidate/saved-jobs",
        "/api/candidate/applications",
        "/api/conversations",
        "/api/notifications",
        "/api/employer/my-jobs",
        "/api/employer/applications",
        "/api/admin/users",
        "/api/admin/jobs",
        "/api/admin/categories",
        "/api/admin/skills",
      ].includes(path)
    )
      return sendList(response);
    return send(response, 404);
  }
  if (
    request.method !== "POST" &&
    !(request.method === "PUT" && path === "/api/user/change-password")
  )
    return send(response, 404);
  try {
    const body = await readBody(request);
    if (path === "/api/login") {
      loginRequests += 1;
      if (body.email === "locked@example.test")
        return send(response, 403, null, "account_locked");
      const user = identities[body.email];
      if (!user || typeof body.password !== "string" || !body.password.length)
        return send(response, 401, null, "invalid_credentials");
      const loginToken = `test-${user.role}-token`;
      revokedTokens.delete(loginToken);
      return send(response, 200, {
        token: loginToken,
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      });
    }
    if (path === "/api/register") {
      if (body.email === "duplicate@example.test")
        return send(response, 422, null, "email_taken", {
          email: ["Email đã được sử dụng"],
        });
      return send(response, 201);
    }
    if (path === "/api/forgot-password") return sendVoid(response);
    if (path === "/api/verify-reset-token") {
      if (body.token === "unavailable-reset-token") return send(response, 503);
      return body.token === "valid-reset-token"
        ? send(response, 200, { email: body.email })
        : send(response, 400, null, "invalid_reset_token");
    }
    if (path === "/api/reset-password") {
      return body.token === "valid-reset-token"
        ? send(response, 200)
        : send(response, 400, null, "invalid_reset_token");
    }
    if (path === "/api/logout") {
      if (token) revokedTokens.add(token);
      return sendVoid(response);
    }
    if (path === "/api/user/change-password") {
      if (!token || revokedTokens.has(token))
        return send(response, 401, null, "unauthenticated");
      if (body.current_password === "WrongPass1!")
        return send(response, 400, null, "invalid_current_password");
      return sendVoid(response);
    }
    return send(response, 404);
  } catch {
    return send(response, 400, null, "invalid_request");
  }
});

server.listen(4119, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
