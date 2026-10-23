import assert from "node:assert/strict";
import test from "node:test";
import { safeJobReturnPath } from "../src/lib/return-path";

test("auth handoff only permits known internal job and account routes", () => {
  assert.equal(safeJobReturnPath("/jobs/1"), "/jobs/1");
  assert.equal(
    safeJobReturnPath("/jobs?keyword=Laravel"),
    "/jobs?keyword=Laravel",
  );
  for (const path of [
    "/account/profile",
    "/account/jobs?tab=saved",
    "/account/security",
  ])
    assert.equal(safeJobReturnPath(path), path);
  for (const value of [
    undefined,
    ["/jobs/1"],
    "https://example.com",
    "//example.com",
    "/jobs/../admin",
    "/jobs\\example.com",
    "javascript:alert(1)",
    "/jobs#example",
    "/account/profile/../../admin",
    "/account/unknown",
    "/admin",
    "/account/profile\n",
    "/jobs?" + "a".repeat(1000),
  ])
    assert.equal(safeJobReturnPath(value), "/jobs");
});

test("employer handoff only permits implemented employer destinations", () => {
  for (const path of [
    "/employer",
    "/employer/jobs",
    "/employer/jobs?status=closed&page=2",
    "/employer/jobs/new",
    "/employer/jobs/12/edit",
    "/employer/candidates?job_id=1&status=applied",
    "/employer/candidates/12?job_id=2&page=2",
    "/employer/messages?conversation=2",
    "/employer/notifications",
    "/employer/company",
  ]) {
    assert.equal(safeJobReturnPath(path), path);
    assert.equal(safeJobReturnPath(path, "employer"), path);
    assert.equal(safeJobReturnPath(path, "candidate"), "/jobs");
  }
  for (const path of [
    "/employer/arbitrary",
    "/employer/candidates/0",
    "/employer/candidates/-1",
    "/employer/candidates/01",
    "/employer/candidates/1/delete",
    "/employer/jobs/0/edit",
    "/employer/jobs/-1/edit",
    "/employer/jobs/01/edit",
    "/employer/jobs/1",
    "/employer/jobs/new/edit",
    "/employer/jobs/1/delete",
    "/employer/../admin",
    "/employer/%2e%2e/admin",
    "/employer%2fjobs",
    "/employer//jobs",
    "/employer.evil.example",
    "/employer\\@evil.example",
    "/employer\n",
    "/employer#https://evil.example",
    "//evil.example/employer",
    "https://evil.example/employer",
  ]) {
    assert.equal(safeJobReturnPath(path), "/jobs");
    assert.equal(safeJobReturnPath(path, "employer"), "/employer");
  }
});

test("role landings reject cross-role destinations and preserve shared security", () => {
  assert.equal(safeJobReturnPath(undefined, "candidate"), "/jobs");
  assert.equal(safeJobReturnPath(undefined, "employer"), "/employer");
  assert.equal(safeJobReturnPath(undefined, "admin"), "/admin");
  assert.equal(safeJobReturnPath("/account/profile", "employer"), "/employer");
  assert.equal(safeJobReturnPath("/jobs/12", "employer"), "/employer");
  assert.equal(
    safeJobReturnPath("/account/jobs?tab=saved", "candidate"),
    "/account/jobs?tab=saved",
  );
  assert.equal(
    safeJobReturnPath("/employer/messages?conversation=2", "admin"),
    "/admin",
  );
  for (const role of ["candidate", "employer", "admin"] as const) {
    assert.equal(
      safeJobReturnPath("/account/security", role),
      "/account/security",
    );
    assert.equal(
      safeJobReturnPath("/account/security?tab=password", role),
      "/account/security?tab=password",
    );
  }
});
