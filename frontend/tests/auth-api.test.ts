import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AuthApiError,
  mapAuthApiError,
  parseLogin,
  parseUser,
} from "../src/features/auth/api-contract";

const user = {
  id: 1,
  name: "Nguyễn Văn An",
  email: "an@example.com",
  role: "candidate",
  status: "active",
};

test("user parser returns only known fields and preserves backend role/status", () => {
  assert.deepEqual(
    parseUser({ ...user, password: "secret", access_token: "secret" }),
    user,
  );
  assert.equal(
    parseUser({ ...user, role: "employer", status: "locked" }).status,
    "locked",
  );
  assert.equal(parseUser({ ...user, role: "admin" }).role, "admin");
});

test("user parser rejects malformed identity, role and account status", () => {
  for (const value of [
    null,
    [],
    "user",
    { ...user, id: "1" },
    { ...user, id: 0 },
    { ...user, id: 1.2 },
    { ...user, name: " " },
    { ...user, email: "bad-email" },
    { ...user, role: "superadmin" },
    { ...user, status: "unknown" },
    { ...user, role: ["candidate"] },
    { ...user, status: ["active"] },
  ]) {
    assert.throws(
      () => parseUser(value),
      (error) =>
        error instanceof AuthApiError && error.code === "invalid_response",
    );
  }
});

test("login parser supports both proposed token field names and validates supplied expiration", () => {
  assert.deepEqual(parseLogin({ access_token: "1|valid-token" }), {
    token: "1|valid-token",
  });
  const expires_at = new Date(Date.now() + 60_000).toISOString();
  assert.deepEqual(parseLogin({ token: "valid-token", expires_at }), {
    token: "valid-token",
    expires_at,
  });
  for (const value of [
    null,
    {},
    { token: "" },
    { token: "secret\r\nInjected" },
    { token: "a b" },
    { token: "a".repeat(2001) },
    { token: "valid", expires_at: "tomorrow" },
    { token: "valid", expires_at: "2020-01-01T00:00:00Z" },
  ]) {
    assert.throws(() => parseLogin(value), AuthApiError);
  }
});

test("API errors never expose backend messages or unknown validation field keys", () => {
  const hostile = {
    message: "SQL error with private credentials",
    errors: {
      email: ["private@example.com already exists"],
      password: ["internal password rule"],
      internal_token: ["secret"],
    },
  };
  const error = mapAuthApiError(422, hostile, "register");
  assert.deepEqual(Object.keys(error.fieldErrors).sort(), [
    "email",
    "password",
  ]);
  assert.doesNotMatch(JSON.stringify(error), /private|secret|SQL|internal/);
  assert.doesNotMatch(error.message, /SQL|private/);
  assert.equal(
    mapAuthApiError(422, { code: "email_taken" }, "register").fieldErrors.email
      .length,
    1,
  );
  assert.equal(
    mapAuthApiError(422, hostile, "forgot-password").fieldErrors.password,
    undefined,
  );
});

test("API errors map authentication, throttling, unavailable routes and transport failures safely", () => {
  assert.equal(mapAuthApiError(401, {}, "login").code, "unauthorized");
  assert.equal(
    mapAuthApiError(401, {}, "login").message,
    "Email hoặc mật khẩu không chính xác",
  );
  assert.equal(
    mapAuthApiError(403, { code: "account_locked" }, "login").message,
    "Tài khoản của bạn đã bị khóa bởi quản trị viên",
  );
  assert.match(
    mapAuthApiError(403, { code: "temporarily_locked" }, "login").message,
    /khôi phục tài khoản/,
  );
  assert.equal(
    mapAuthApiError(400, { code: "invalid_reset_token" }, "reset-password")
      .message,
    "Liên kết xác thực đã hết hạn hoặc không hợp lệ",
  );
  assert.deepEqual(
    mapAuthApiError(
      400,
      { code: "invalid_current_password" },
      "change-password",
    ).fieldErrors.current_password,
    ["Mật khẩu hiện tại không chính xác"],
  );
  assert.deepEqual(
    mapAuthApiError(422, { code: "email_taken" }, "register").fieldErrors.email,
    ["Email đã được sử dụng"],
  );
  assert.equal(mapAuthApiError(403, {}, "user").code, "forbidden");
  assert.equal(mapAuthApiError(419, {}, "logout").code, "session_expired");
  assert.equal(mapAuthApiError(429, {}, "reset-password").code, "rate_limited");
  assert.equal(mapAuthApiError(404, {}, "register").code, "not_available");
  assert.equal(
    mapAuthApiError(503, { message: "ECONNREFUSED upstream-host" }, "login")
      .code,
    "service_unavailable",
  );
});
