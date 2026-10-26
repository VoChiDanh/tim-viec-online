// Test-only HTTP contract fixture. This is not a Laravel backend or an auth mode.
import { createServer } from "node:http";

const revokedTokens = new Set();
let loginRequests = 0;
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
  if (path === "/__test__/stats") return send(response, 200, { loginRequests });
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
    if (path === "/api/forgot-password") return send(response, 200);
    if (path === "/api/reset-password") {
      return body.token === "valid-reset-token"
        ? send(response, 200)
        : send(response, 400, null, "invalid_reset_token");
    }
    if (path === "/api/logout") {
      if (token) revokedTokens.add(token);
      return send(response, 200);
    }
    if (path === "/api/user/change-password") {
      if (!token || revokedTokens.has(token))
        return send(response, 401, null, "unauthenticated");
      if (body.current_password === "WrongPass1!")
        return send(response, 400, null, "invalid_current_password");
      return send(response, 200);
    }
    return send(response, 404);
  } catch {
    return send(response, 400, null, "invalid_request");
  }
});

server.listen(4119, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
