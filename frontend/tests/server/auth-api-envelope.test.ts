import assert from "node:assert/strict";
import { test } from "node:test";
import { apiRequest } from "../../src/services/auth-api";
import { AuthApiError } from "../../src/features/auth/api-contract";

test("void auth actions accept Laravel success/message envelopes without response data", async () => {
  const originalFetch = globalThis.fetch;
  const mode = process.env.AUTH_MODE;
  const base = process.env.AUTH_API_URL;
  process.env.AUTH_MODE = "api";
  process.env.AUTH_API_URL = "http://127.0.0.1:8000/api";
  globalThis.fetch = async () =>
    Response.json({ success: true, message: "Completed" });
  try {
    for (const path of [
      "/forgot-password",
      "/logout",
      "/user/change-password",
    ] as const) {
      assert.equal(await apiRequest(path), null);
    }
    for (const path of [
      "/login",
      "/user",
      "/register",
      "/reset-password",
    ] as const) {
      await assert.rejects(
        apiRequest(path),
        (error: unknown) =>
          error instanceof AuthApiError && error.status === 502,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (mode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = mode;
    if (base === undefined) delete process.env.AUTH_API_URL;
    else process.env.AUTH_API_URL = base;
  }
});

test("void auth actions still reject unsuccessful and malformed successful envelopes", async () => {
  const originalFetch = globalThis.fetch;
  const mode = process.env.AUTH_MODE;
  const base = process.env.AUTH_API_URL;
  process.env.AUTH_MODE = "api";
  process.env.AUTH_API_URL = "http://127.0.0.1:8000/api";
  try {
    for (const body of [{ success: false }, { message: "Completed" }, null]) {
      globalThis.fetch = async () => Response.json(body);
      await assert.rejects(
        apiRequest("/forgot-password"),
        (error: unknown) =>
          error instanceof AuthApiError && error.status === 502,
      );
    }
    globalThis.fetch = async () =>
      Response.json(
        { success: false, message: "Invalid email" },
        { status: 422 },
      );
    await assert.rejects(
      apiRequest("/forgot-password"),
      (error: unknown) => error instanceof AuthApiError && error.status === 422,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (mode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = mode;
    if (base === undefined) delete process.env.AUTH_API_URL;
    else process.env.AUTH_API_URL = base;
  }
});
