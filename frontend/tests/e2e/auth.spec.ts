import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const password = "SafeFixture1!";

test("candidate routes enforce roles and render empty API workspace without mock records", async ({
  page,
  context,
}) => {
  for (const section of ["jobs", "messages", "notifications", "settings"]) {
    await page.goto(`/preview/${section}`);
    await expect(page.locator(".cu-title:visible")).toHaveCount(0);
    await page.goto(`/account/${section}`);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
  await login(page);
  await expect(page).toHaveURL(/\/jobs$/);
  await page.goto("/account/alerts");
  await expect(page).toHaveURL(/\/account\/notifications$/);
  for (const section of ["jobs", "messages", "notifications", "settings"]) {
    await page.goto(`/account/${section}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Tài khoản ứng viên", exact: true }),
    ).toBeVisible();
    if (section === "settings") {
      await expect(
        page.getByLabel("Email đăng nhập", { exact: true }),
      ).toHaveValue("candidate@example.test");
      await expect(
        page.getByRole("link", { name: "Đổi mật khẩu", exact: true }),
      ).toHaveAttribute("href", "/account/security");
    }
    await expect(page.getByText(/hiện chưa khả dụng/)).toHaveCount(0);
    await expect(page.getByText("Nguyễn Minh An", { exact: true })).toHaveCount(
      0,
    );
  }
  await context.clearCookies();
  await login(page, "employer@example.test");
  await expect(page).toHaveURL(/\/employer$/);
  for (const section of ["jobs", "messages", "notifications", "settings"]) {
    await page.goto(`/account/${section}`);
    await expect(page).toHaveURL(/\/employer$/);
  }
});

test("profile preview enforces authentication and profile uses the API identity", async ({
  page,
  context,
}) => {
  await page.goto("/preview/profile");
  await expect(
    page.getByRole("heading", { name: "Nguyễn Minh An", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Áp dụng bản xem trước", exact: true }),
  ).toHaveCount(0);
  await page.goto("/account/profile");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await login(page);
  await expect(page).toHaveURL(/\/jobs$/);
  await page.goto("/account/profile");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Nguyễn Minh Anh",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Hồ sơ hiện chưa khả dụng. Vui lòng quay lại sau.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await context.clearCookies();
  await login(page, "employer@example.test");
  await expect(page).toHaveURL(/\/employer$/);
  await page.goto("/account/profile");
  await expect(page).toHaveURL(/\/employer$/);
});

async function login(
  page: Page,
  email = "candidate@example.test",
  returnTo?: string,
) {
  await page.goto(
    `/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`,
  );
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Mật khẩu$/, { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}

async function registration(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel(/^Họ và tên/).fill("Nguyễn Minh Anh");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Ngày sinh/).fill("20/05/2000");
  await page.getByLabel(/^Mật khẩu$/, { exact: true }).fill(password);
  await page.getByLabel(/^Xác nhận mật khẩu/).fill(password);
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
}

test("candidate login preserves only an internal job return path and uses a private session cookie", async ({
  page,
  context,
}) => {
  let submissionBody = "";
  await page.route(/\/login(?:\?.*)?$/, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch({ maxRedirects: 0 });
    submissionBody = await response.text();
    await route.fulfill({ response });
  });
  await login(page, "candidate@example.test", "/jobs/1");
  await expect(page).toHaveURL(/\/jobs\/1$/);
  expect(submissionBody).not.toBe("");
  expect(submissionBody).not.toMatch(/test-candidate-token|SafeFixture1!/);
  const cookie = (await context.cookies()).find(
    (item) => item.name === "timviec_session",
  );
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, path: "/" });
  expect(["Strict", "Lax"]).toContain(cookie?.sameSite);
  expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000);
  expect(cookie?.expires).toBeLessThanOrEqual(Date.now() / 1000 + 3600);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "timviec_session",
  );
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  expect(JSON.stringify(storage)).not.toMatch(
    /test-candidate-token|SafeFixture1!|candidate@example\.test/,
  );
});

test("unsafe external return URL is rejected", async ({ page }) => {
  await login(page, "candidate@example.test", "https://example.com/steal");
  await expect(page).toHaveURL(/\/jobs$/);
});

test("authenticated candidate actions use API workspace and failed writes do not create a login loop", async ({
  page,
}) => {
  await login(page, "candidate@example.test", "/jobs/1");
  await expect(page).toHaveURL(/\/jobs\/1$/);
  await page
    .getByRole("button", { name: "Ứng tuyển ngay", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Nộp hồ sơ ứng tuyển" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lưu việc làm", exact: true })
    .first()
    .click();
  await expect(page.locator("[data-sonner-toast]")).toContainText(
    "Request rejected",
  );
  await expect(page).toHaveURL(/\/jobs\/1$/);
  await expect(
    page.getByRole("link", { name: "Đến trang đăng nhập", exact: true }),
  ).toHaveCount(0);
});

test("cross-origin login submissions cannot establish a session", async ({
  page,
  context,
  request,
}) => {
  const captured = new Promise<{
    headers: Record<string, string>;
    body: Buffer;
  }>((resolve) => {
    void page.route(/\/login(?:\?.*)?$/, async (route) => {
      const action = route.request();
      if (action.method() !== "POST") return route.continue();
      resolve({ headers: action.headers(), body: action.postDataBuffer()! });
      await route.abort("blockedbyclient");
    });
  });
  await login(page);
  const action = await captured;
  expect(action.headers["next-action"]).toBeTruthy();
  const before = await (
    await request.get("http://127.0.0.1:4119/__test__/stats")
  ).json();
  const headers: Record<string, string> = {
    ...action.headers,
    origin: "https://example.com",
  };
  for (const header of ["host", "cookie", "content-length"])
    delete headers[header];
  const rejected = await request.post("http://localhost:3119/login", {
    headers,
    data: action.body,
    maxRedirects: 0,
  });
  const body = await rejected.text();
  expect(
    rejected.status() >= 400 ||
      /Yêu cầu không hợp lệ|invalid.origin|Invalid Server Actions request/i.test(
        body,
      ),
  ).toBe(true);
  expect(rejected.headers()["set-cookie"] ?? "").not.toContain(
    "timviec_session",
  );
  expect(rejected.headers()["x-action-redirect"] ?? "").not.toContain("/jobs");
  const after = await (
    await request.get("http://127.0.0.1:4119/__test__/stats")
  ).json();
  expect(after.data.loginRequests).toBe(before.data.loginRequests);
  expect(
    (await context.cookies()).some((item) => item.name === "timviec_session"),
  ).toBe(false);
});

test("roles come from the authenticated API user and restrict employer/admin pages", async ({
  page,
}) => {
  await login(page);
  await expect(page).toHaveURL(/\/jobs$/);
  await page.goto("/employer");
  await expect(page).toHaveURL(/\/jobs$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/jobs$/);
});

test("employer login lands on employer area and logout revokes the session", async ({
  page,
  context,
  request,
}) => {
  await login(page, "employer@example.test");
  await expect(page).toHaveURL(/\/employer$/);
  const token = (await context.cookies()).find(
    (item) => item.name === "timviec_session",
  )?.value;
  await page
    .getByRole("button", { name: "Tài khoản cá nhân", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(
    (await context.cookies()).some((item) => item.name === "timviec_session"),
  ).toBe(false);
  const response = await request.get("http://127.0.0.1:4119/api/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(401);
  await page.goto("/employer");
  await expect(page).toHaveURL(/\/login/);
});

test("admin login follows the backend role", async ({ page }) => {
  await login(page, "admin@example.test");
  await expect(page).toHaveURL(/\/admin$/);
});

test("API admin routes and legacy preview URLs render API records without demo reset controls", async ({
  page,
}) => {
  await login(page, "admin@example.test", "/admin/jobs/1");
  await expect(page).toHaveURL(/\/admin\/jobs\/1$/);
  for (const path of [
    "/admin",
    "/admin/users",
    "/admin/categories",
    "/admin/skills",
    "/admin/jobs",
    "/admin/jobs/1?preview=true",
    "/admin/jobs/1?preview=1",
    "/admin/preview",
    "/admin/users/preview",
    "/admin/categories/preview",
    "/admin/skills/preview",
    "/admin/jobs/preview",
    "/admin/jobs/1/preview",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByText("Dữ liệu quản trị chưa được kết nối", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".ap-preview")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Khôi phục mẫu", exact: true }),
    ).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toContain("admin@timviec.vn");
    expect(html).not.toContain("employer@timviec.vn");
    expect(html).not.toContain("candidate@timviec.vn");
  }
});

test("unknown API roles and invalid sessions never authorize a protected page", async ({
  page,
  context,
}) => {
  await login(page, "unsupported@example.test");
  await expect(page).toHaveURL(/\/login/);
  expect(
    (await context.cookies()).some((item) => item.name === "timviec_session"),
  ).toBe(false);
  await context.addCookies([
    {
      name: "timviec_session",
      value: "expired-or-invalid-token",
      url: "http://localhost:3119",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/employer");
  await expect(page).toHaveURL(/\/login/);
});

test("login distinguishes incorrect credentials and an administratively locked account", async ({
  page,
  context,
}) => {
  await login(page, "invalid@example.test");
  await expect(
    page.getByText("Email hoặc mật khẩu không chính xác", { exact: false }),
  ).toBeVisible();
  await login(page, "locked@example.test");
  await expect(page.getByText(/Tài khoản.*đã bị khóa/)).toBeVisible();
  expect(
    (await context.cookies()).some((item) => item.name === "timviec_session"),
  ).toBe(false);
});

test("duplicate registration email preserves non-secret values and never creates a session", async ({
  page,
  context,
}) => {
  await registration(page, "duplicate@example.test");
  await page.getByRole("button", { name: /Đăng ký|Tạo tài khoản/ }).click();
  await expect(
    page.getByText("Email đã được sử dụng", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Họ và tên/)).toHaveValue("Nguyễn Minh Anh");
  await expect(page.getByLabel(/^Email/)).toHaveValue("duplicate@example.test");
  await page.getByLabel(/^Email/).focus();
  await page.getByLabel(/^Họ và tên/).focus();
  await expect(
    page.getByText("Email đã được sử dụng", { exact: true }),
  ).toBeVisible();
  await page.getByLabel(/^Họ và tên/).fill("Nguyễn Minh Anh Trần");
  await expect(
    page.getByText("Email đã được sử dụng", { exact: true }),
  ).toBeVisible();
  await page.getByLabel(/^Email/).fill("different@example.test");
  await expect(
    page.getByText("Email đã được sử dụng", { exact: true }),
  ).toHaveCount(0);
  expect(
    (await context.cookies()).some((item) => item.name === "timviec_session"),
  ).toBe(false);
});

test("successful registration opens verification instructions without silently authenticating", async ({
  page,
  context,
}) => {
  await registration(page, "new@example.test");
  await page.getByRole("button", { name: /Đăng ký|Tạo tài khoản/ }).click();
  await expect(page).toHaveURL(/\/verify-email\?email=new%40example.test$/);
  await expect(
    page.getByRole("button", { name: "Gửi lại email xác thực", exact: true }),
  ).toBeVisible();
  expect(
    (await context.cookies()).some((item) => item.name === "timviec_session"),
  ).toBe(false);
});

test("forgot-password has an account-neutral response", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel(/^Email/).fill("nonexistent@example.test");
  await page.getByRole("button", { name: /Gửi/ }).click();
  await expect(page.getByText(/Nếu.*email|Nếu.*tài khoản/i)).toBeVisible();
});

test("reset-password rejects expired tokens and returns to login after a valid reset", async ({
  page,
}) => {
  for (const token of ["invalid-reset-token", "valid-reset-token"]) {
    await page.goto(
      `/reset-password?email=candidate%40example.test&token=${token}`,
    );
    if (token === "invalid-reset-token") {
      await expect(
        page.getByRole("link", { name: "Yêu cầu liên kết mới", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel(/^Mật khẩu mới/)).toHaveCount(0);
      continue;
    }
    await page.getByLabel(/^Mật khẩu mới/).fill(password);
    await page.getByLabel(/^Xác nhận mật khẩu/).fill(password);
    await page
      .getByRole("button", {
        name: /Đặt lại mật khẩu|Lưu mật khẩu|Cập nhật mật khẩu/,
      })
      .click();
    await expect(page).toHaveURL(/\/login\?.*notice=reset/);
  }
});

test("reset link verification distinguishes service outages from expired links", async ({
  page,
}) => {
  await page.goto(
    "/reset-password?email=candidate%40example.test&token=unavailable-reset-token",
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Chưa thể kiểm tra liên kết",
  );
  await expect(
    page.getByText("Liên kết xác thực đã hết hạn hoặc không hợp lệ", {
      exact: false,
    }),
  ).toHaveCount(0);
  await expect(page.getByLabel(/^Mật khẩu mới/)).toHaveCount(0);
});

test("changing a password requires a session and verifies the current password", async ({
  page,
}) => {
  await page.goto("/account/security");
  await expect(page).toHaveURL(/\/login/);
  await login(page);
  await expect(page).toHaveURL(/\/jobs$/);
  await page.goto("/account/security");
  await page.getByLabel(/^Mật khẩu hiện tại/).fill("WrongPass1!");
  await page.getByLabel(/^Mật khẩu mới/).fill(password);
  await page.getByLabel(/^Xác nhận mật khẩu/).fill(password);
  await page
    .getByRole("button", {
      name: /Đổi mật khẩu|Cập nhật mật khẩu|Lưu mật khẩu/,
    })
    .click();
  await expect(
    page.getByText("Mật khẩu hiện tại không chính xác", { exact: false }),
  ).toBeVisible();
  await page.getByLabel(/^Mật khẩu hiện tại/).fill("OldFixture1!");
  await page.getByLabel(/^Mật khẩu mới/).fill("NewFixture2!");
  await page.getByLabel(/^Xác nhận mật khẩu/).fill("NewFixture2!");
  await page
    .getByRole("button", {
      name: /Đổi mật khẩu|Cập nhật mật khẩu|Lưu mật khẩu/,
    })
    .click();
  await expect(
    page.getByText("Đổi mật khẩu thành công.", { exact: true }),
  ).toBeVisible();
});

test("authentication pages are accessible and fit a 360px viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 900 });
  for (const path of [
    "/login",
    "/register",
    "/forgot-password",
    "/verify-email?email=person%40example.test",
    "/reset-password?email=candidate%40example.test&token=valid-reset-token",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`${path.split("?")[0].slice(1)}-mobile.png`),
      fullPage: true,
    });
  }
});

test("verification GET leaves links unused until explicit confirmation and replay fails safely", async ({
  page,
  request,
  context,
}) => {
  const url = `/verify-email?email=verify-once%40example.test&token=${"v".repeat(64)}`;
  const before =
    (await (await request.get("http://127.0.0.1:4119/__test__/stats")).json())
      .data.requests["/api/email/verify"] ?? 0;
  await page.goto(url);
  await expect(
    page.getByRole("button", { name: "Xác thực email", exact: true }),
  ).toBeVisible();
  await page.reload();
  expect(
    (await (await request.get("http://127.0.0.1:4119/__test__/stats")).json())
      .data.requests["/api/email/verify"] ?? 0,
  ).toBe(before);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    "content",
    "no-referrer",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await page
    .getByRole("button", { name: "Xác thực email", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?notice=verified$/);
  await expect(page.getByRole("status")).toContainText(
    "Xác thực email thành công",
  );
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "timviec_session",
    ),
  ).toBe(false);
  await page.goto(url);
  await page
    .getByRole("button", { name: "Xác thực email", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "hết hạn hoặc không hợp lệ",
  );
  await expect(
    page.getByRole("button", { name: "Xác thực email", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Gửi lại email xác thực", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Nếu email cần xác thực",
  );
});

test("verification handles malformed links, unavailable services and account-neutral resend throttling", async ({
  page,
}) => {
  await page.goto("/verify-email?email=person%40example.test&token=malformed");
  await expect(page.getByRole("alert")).toContainText("không hợp lệ");
  await expect(
    page.getByRole("button", { name: "Xác thực email", exact: true }),
  ).toHaveCount(0);
  await page.goto(
    `/verify-email?email=person%40example.test&token=${"n".repeat(64)}`,
  );
  await page
    .getByRole("button", { name: "Xác thực email", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Không thể kết nối");
  await expect(
    page.getByRole("button", { name: "Xác thực email", exact: true }),
  ).toBeEnabled();
  await page.goto("/verify-email?email=throttled%40example.test");
  await page
    .getByRole("button", { name: "Gửi lại email xác thực", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("quá nhiều lần");
  await page
    .getByLabel("Email nhận liên kết xác thực")
    .fill("missing@example.test");
  await page
    .getByRole("button", { name: "Gửi lại email xác thực", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Nếu email cần xác thực",
  );
});

test("verification keeps an existing session when confirming another mailbox", async ({
  page,
  context,
}) => {
  await login(page);
  await expect(page).toHaveURL(/\/jobs$/);
  const before = (await context.cookies()).find(
    (cookie) => cookie.name === "timviec_session",
  )?.value;
  await page.goto(
    `/verify-email?email=other-mailbox%40example.test&token=${"v".repeat(64)}`,
  );
  await page
    .getByRole("button", { name: "Xác thực email", exact: true })
    .click();
  await expect(page).toHaveURL(/\/jobs$/);
  expect(
    (await context.cookies()).find(
      (cookie) => cookie.name === "timviec_session",
    )?.value,
  ).toBe(before);
});

test("cross-origin verification cannot consume an email link", async ({
  page,
  request,
}) => {
  const captured = new Promise<{
    headers: Record<string, string>;
    body: Buffer;
  }>((resolve) => {
    void page.route(/\/verify-email(?:\?.*)?$/, async (route) => {
      const action = route.request();
      if (action.method() !== "POST") return route.continue();
      resolve({ headers: action.headers(), body: action.postDataBuffer()! });
      await route.abort("blockedbyclient");
    });
  });
  const url = `/verify-email?email=cross-origin%40example.test&token=${"v".repeat(64)}`;
  await page.goto(url);
  const before =
    (await (await request.get("http://127.0.0.1:4119/__test__/stats")).json())
      .data.requests["/api/email/verify"] ?? 0;
  await page
    .getByRole("button", { name: "Xác thực email", exact: true })
    .click();
  const action = await captured;
  const headers: Record<string, string> = {
    ...action.headers,
    origin: "https://example.com",
  };
  for (const header of ["host", "cookie", "content-length"])
    delete headers[header];
  const response = await request.post(`http://localhost:3119${url}`, {
    headers,
    data: action.body,
    maxRedirects: 0,
  });
  expect(
    response.status() >= 400 ||
      /Yêu cầu không hợp lệ|invalid.origin|Invalid Server Actions request/i.test(
        await response.text(),
      ),
  ).toBe(true);
  expect(
    (await (await request.get("http://127.0.0.1:4119/__test__/stats")).json())
      .data.requests["/api/email/verify"] ?? 0,
  ).toBe(before);
});
