import { test, expect, type Page, type APIResponse } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const origin = "http://localhost:3127";
const fixture = () =>
  JSON.parse(
    readFileSync(
      path.resolve(
        "../backend/storage/framework/testing/frontend-e2e/fixture.json",
      ),
      "utf8",
    ),
  ) as Record<string, number>;
const pdf = () =>
  readFileSync(
    path.resolve(
      "../backend/storage/framework/testing/frontend-e2e/app/private/cvs/e2e-profile.pdf",
    ),
  );
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRFsAAAAASUVORK5CYII=",
  "base64",
);
async function login(page: Page, role: string, destination: string) {
  await page.goto(`/login?returnTo=${encodeURIComponent(destination)}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${role}@frontend-e2e.test`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("BrowserTest1!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(`${origin}${destination}`, { timeout: 20_000 });
}
async function api(
  page: Page,
  resource: string,
  method = "GET",
  data?: unknown,
): Promise<APIResponse> {
  return page.request.fetch(`/api/backend${resource}`, {
    method,
    headers: { Origin: origin },
    ...(data === undefined ? {} : { data }),
  });
}

test.describe.serial("Laravel integration without AI", () => {
  test("public data, protected BFF, candidate profile/CV/save/apply persist after reload", async ({
    page,
  }) => {
    const ids = fixture();
    await page.goto("/jobs?keyword=Backend&level=Middle&sort=salary_desc");
    await expect(
      page.getByRole("link", { name: "Backend Engineer E2E", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator(".site-footer")
        .getByRole("link", { name: "E2E Engineering", exact: true }),
    ).toBeVisible();
    expect((await api(page, "/candidate/profile")).status()).toBe(401);
    await login(page, "candidate", "/account/profile");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Candidate",
    );
    await page
      .getByLabel("Họ và tên", { exact: true })
      .fill("E2E Candidate Updated");
    await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "E2E Candidate Updated",
    );
    await page.reload();
    await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
      "E2E Candidate Updated",
    );
    await page
      .getByLabel("Ảnh đại diện", { exact: true })
      .setInputFiles({
        name: "avatar.png",
        mimeType: "image/png",
        buffer: png,
      });
    await expect(
      page
        .getByRole("img", { name: "Ảnh đại diện đã chọn", exact: true })
        .first(),
    ).toBeVisible();
    await page.getByLabel("Chọn CV PDF", { exact: true }).setInputFiles({
      name: "updated-cv.pdf",
      mimeType: "application/pdf",
      buffer: pdf(),
    });
    await expect
      .poll(async () => (await api(page, "/candidate/cv/file")).status())
      .toBe(200);
    await page.goto(`/jobs/${ids.job_id}`);
    await page
      .locator(".guest-actions")
      .getByRole("button", { name: "Lưu việc làm", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Bỏ lưu việc làm", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ứng tuyển ngay", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Nộp hồ sơ ứng tuyển",
      exact: true,
    });
    await dialog
      .getByLabel(/Thư giới thiệu/)
      .fill("I can build reliable Laravel and Next.js applications.");
    await dialog
      .getByRole("button", { name: "Xác nhận ứng tuyển", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Đã ứng tuyển", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Đã ứng tuyển", exact: true }),
    ).toBeVisible();
    const history = await (await api(page, "/candidate/applications")).json();
    expect(history.data).toHaveLength(2);
    expect(JSON.stringify(history)).not.toContain("match_score");
    expect(
      (
        await api(page, `/employer/applications/${ids.application_id}`)
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/backend/notifications/read-all", {
          headers: { Origin: "https://evil.test" },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await page.request.patch("/api/backend/notifications/read-all", {
          headers: { Origin: "https://evil.test" },
        })
      ).status(),
    ).toBe(403);
    await page.goto("/account/notifications");
    await page
      .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })
      .click();
    await expect
      .poll(async () => {
        const result = await (await api(page, "/notifications")).json();
        return result.data.every((item: { is_read: boolean }) => item.is_read);
      })
      .toBe(true);
    const cookie = (await page.context().cookies()).find(
      (item) => item.name === "timviec_session",
    );
    expect(cookie?.httpOnly).toBe(true);
    await page.goto("/account/jobs");
    const ownRow = page
      .locator(".cu-job")
      .filter({ hasText: "Backend Engineer E2E" });
    await ownRow
      .getByRole("button", { name: "Trao đổi với nhà tuyển dụng", exact: true })
      .click();
    await expect(page).toHaveURL(/\/account\/messages\?conversation=\d+$/);
    await page.goto("/account/jobs");
    await ownRow
      .getByRole("button", {
        name: "Rút hồ sơ Backend Engineer E2E",
        exact: true,
      })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Xác nhận", exact: true })
      .click();
    await expect(ownRow).toContainText("Đã rút hồ sơ");
    expect(
      (
        await api(page, `/jobs/${ids.job_id}/apply`, "POST", {
          cv_source: "profile",
        })
      ).status(),
    ).toBe(409);
  });

  test("employer sees associated job, reviews real PDF, updates status/company/job", async ({
    page,
  }) => {
    const ids = fixture();
    await login(page, "employer", "/employer/candidates");
    await expect(
      page.getByRole("link", { name: /E2E Candidate Updated/ }).first(),
    ).toBeVisible();
    await page.goto(`/employer/candidates/${ids.application_id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Đánh giá độ phù hợp", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Frontend Engineer E2E", { exact: true }).first(),
    ).toBeVisible();
    const cv = await api(page, `/applications/${ids.application_id}/cv`);
    expect(cv.status()).toBe(200);
    expect(cv.headers()["content-type"]).toContain("application/pdf");
    expect((await cv.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await page
      .getByRole("combobox", { name: "Trạng thái xét duyệt", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Trúng tuyển", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cập nhật trạng thái", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await (
              await api(page, `/employer/applications/${ids.application_id}`)
            ).json()
          ).data.status,
      )
      .toBe("accepted");
    await page.goto("/employer/company");
    await page
      .getByLabel("Tên công ty", { exact: true })
      .fill("E2E Software Updated");
    await page
      .getByLabel("Logo công ty", { exact: true })
      .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
    await expect(
      page.getByRole("img", { name: "Logo công ty", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Lưu thông tin công ty", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await (await api(page, "/employer/company")).json()).data.name,
      )
      .toBe("E2E Software Updated");
    await page.reload();
    await expect(page.getByLabel("Tên công ty", { exact: true })).toHaveValue(
      "E2E Software Updated",
    );
    await page.goto(`/employer/jobs/${ids.job_id}/edit`);
    await page
      .getByLabel("Tiêu đề việc làm", { exact: true })
      .fill("Backend Engineer E2E Updated");
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(page).toHaveURL(/\/employer\/jobs$/);
    await expect(
      page.getByRole("link", {
        name: "Xem/sửa tin Backend Engineer E2E Updated",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      (
        await api(page, `/employer/jobs/${ids.job_id}/status`, "PATCH", {
          status: "closed",
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await api(page, `/employer/jobs/${ids.job_id}/status`, "PATCH", {
          status: "active",
        })
      ).ok(),
    ).toBe(true);
    expect((await api(page, "/admin/users")).status()).toBe(403);
  });

  test("two role chat receives WebSocket messages and private images without reload", async ({
    page,
    browser,
  }) => {
    const ids = fixture();
    const otherContext = await browser.newContext({ baseURL: origin });
    const employer = await otherContext.newPage();
    const receivedMessages: string[] = [];
    employer.on("websocket", (socket) =>
      socket.on("framereceived", (frame) => {
        try {
          const event = JSON.parse(String(frame.payload));
          if (event.event === "message.sent")
            receivedMessages.push(JSON.parse(event.data).message);
        } catch {
          /* Ignore protocol control frames. */
        }
      }),
    );
    try {
      await login(
        page,
        "candidate",
        `/account/messages?conversation=${ids.conversation_id}`,
      );
      await login(
        employer,
        "employer",
        `/employer/messages?conversation=${ids.conversation_id}`,
      );
      await expect(
        employer
          .getByRole("region", { name: /^Nội dung hội thoại với/ })
          .getByText("Initial browser fixture message", { exact: true }),
      ).toBeVisible();
      const text = "Realtime candidate message from genuine Laravel";
      await page.bringToFront();
      await page.getByLabel("Tin nhắn của bạn", { exact: true }).fill(text);
      // Keep the receiver visible before sending through the candidate's authenticated BFF.
      await employer.bringToFront();
      expect(
        (
          await api(
            page,
            `/conversations/${ids.conversation_id}/messages`,
            "POST",
            { message: text },
          )
        ).ok(),
      ).toBe(true);
      await expect
        .poll(() => receivedMessages.includes(text), { timeout: 10_000 })
        .toBe(true);
      await expect(
        employer.getByText(text, { exact: true }).last(),
      ).toBeVisible({ timeout: 10_000 });
      await employer
        .getByLabel("Tin nhắn của bạn", { exact: true })
        .fill("Employer real reply");
      await employer
        .getByLabel("Tin nhắn của bạn", { exact: true })
        .press("Enter");
      await expect(
        employer.getByText("Employer real reply", { exact: true }).last(),
      ).toBeVisible();
      await page.bringToFront();
      await expect(
        page.getByText("Employer real reply", { exact: true }).last(),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByLabel("Ảnh đính kèm", { exact: true }).setInputFiles({
        name: "chat.png",
        mimeType: "image/png",
        buffer: png,
      });
      await page.getByRole("button", { name: "Gửi", exact: true }).click();
      await expect(
        page
          .getByRole("link", { name: "Xem ảnh đính kèm", exact: true })
          .last(),
      ).toBeVisible();
      const image = await page
        .getByRole("link", { name: "Xem ảnh đính kèm", exact: true })
        .last()
        .getAttribute("href");
      expect(image).toMatch(
        /^\/api\/backend\/conversations\/\d+\/messages\/\d+\/image$/,
      );
      expect((await page.request.get(image!)).status()).toBe(200);
      const anon = await browser.newContext({ baseURL: origin });
      expect((await anon.request.get(image!)).status()).toBe(401);
      await anon.close();
    } finally {
      await otherContext.close();
    }
  });

  test("admin catalog CRUD persists and locking revokes candidate sessions", async ({
    page,
    browser,
  }) => {
    const ids = fixture();
    await login(page, "admin", "/admin/skills");
    await page
      .getByRole("button", { name: "Thêm kỹ năng", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^Tên kỹ năng/).fill("Browser API skill");
    await dialog
      .getByRole("button", { name: "Lưu kỹ năng", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(
      page.getByRole("cell", { name: "Browser API skill", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Sửa Browser API skill", exact: true })
      .click();
    await dialog.getByLabel(/^Tên kỹ năng/).fill("Browser API skill edited");
    await dialog
      .getByRole("button", { name: "Lưu kỹ năng", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await page
      .getByRole("button", {
        name: "Xóa Browser API skill edited",
        exact: true,
      })
      .click();
    await dialog
      .getByRole("button", { name: "Xóa khỏi danh mục", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Tổng quan hệ thống", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Khôi phục mẫu", exact: true }),
    ).toHaveCount(0);
    const candidateContext = await browser.newContext({ baseURL: origin });
    try {
      const candidate = await candidateContext.newPage();
      await login(candidate, "outsider", "/account/profile");
      expect(
        (
          await api(page, `/admin/users/${ids.outsider_id}/status`, "PATCH", {
            status: "locked",
          })
        ).ok(),
      ).toBe(true);
      expect((await api(candidate, "/candidate/profile")).status()).toBe(401);
      expect(
        (
          await api(page, `/admin/users/${ids.outsider_id}/status`, "PATCH", {
            status: "active",
          })
        ).ok(),
      ).toBe(true);
    } finally {
      await candidateContext.close();
    }
  });
});
