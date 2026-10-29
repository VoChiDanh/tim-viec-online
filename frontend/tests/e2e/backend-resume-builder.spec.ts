import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

async function expectPaintedPdf(page: Page) {
  const canvas = page.locator(".resume-pdf-pages canvas").first();
  await expect(canvas).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate((node: HTMLCanvasElement) => {
        const box = node.getBoundingClientRect();
        return Math.abs(box.width / box.height - node.width / node.height);
      }),
    )
    .toBeLessThan(0.01);
  await expect
    .poll(() =>
      canvas.evaluate((node: HTMLCanvasElement) => {
        const context = node.getContext("2d")!;
        const pixels = context.getImageData(0, 0, node.width, node.height).data;
        let ink = 0;
        for (let i = 0; i < pixels.length; i += 16) {
          if (
            pixels[i + 3] > 0 &&
            (pixels[i] < 230 || pixels[i + 1] < 230 || pixels[i + 2] < 230)
          )
            ink++;
        }
        return ink;
      }),
    )
    .toBeGreaterThan(100);
}

test("a candidate creates, saves, previews, exports and applies with an immutable generated CV", async ({
  page,
}, info) => {
  await page.goto("/login?returnTo=%2Faccount%2Fresumes");
  await page
    .getByLabel("Email", { exact: true })
    .fill("candidate@frontend-e2e.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("BrowserTest1!");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/login" &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Đăng nhập", exact: true }).click(),
  ]);
  await expect(page).toHaveURL(/\/account\/resumes$/);
  await page.getByRole("link", { name: "Tạo CV mới", exact: true }).click();
  await page
    .getByLabel("Tên CV", { exact: true })
    .fill("CV kiểm thử trình duyệt");
  await page.getByRole("radio", { name: /Hiện đại/ }).check();
  await page
    .getByRole("button", { name: "Sử dụng mẫu này", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/resumes\/\d+\/edit$/);
  const resumeId = Number(page.url().match(/resumes\/(\d+)/)![1]);
  let releaseUpload!: () => void;
  const uploadGate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });
  await page.route(
    `**/api/backend/candidate/resumes/${resumeId}/assets`,
    async (route) => {
      await uploadGate;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Upload unavailable for this regression check.",
        }),
      });
    },
  );
  const nameBeforeUpload = await page
    .getByLabel("Tên CV", { exact: true })
    .inputValue();
  await page.locator('input[type="file"]').setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByLabel("Tên CV", { exact: true })).toBeDisabled();
  releaseUpload();
  await expect(page.getByLabel("Tên CV", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Tên CV", { exact: true })).toHaveValue(
    nameBeforeUpload,
  );
  await page.unroute(`**/api/backend/candidate/resumes/${resumeId}/assets`);
  await page.getByLabel("Họ và tên", { exact: true }).fill("Nguyễn Minh An");
  await page
    .getByLabel("Chức danh / vị trí mong muốn", { exact: true })
    .fill("Kỹ sư phần mềm");
  await page
    .getByLabel("Giới thiệu / mục tiêu nghề nghiệp", { exact: true })
    .fill("Xây dựng phần mềm phục vụ cộng đồng.");
  await page.getByRole("button", { name: "Lưu ngay", exact: true }).click();
  await expect(page.locator(".resume-save-status")).toHaveText("Đã lưu");
  await expect(page.getByTitle("Bản PDF xem trước")).toBeVisible();
  await expectPaintedPdf(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await expectPaintedPdf(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Nguyễn Minh An",
  );
  await expect(page.getByLabel("Mẫu CV", { exact: true })).toHaveValue(
    "modern",
  );
  // A second tab must retain its edits after a revision conflict.
  const other = await page.context().newPage();
  await other.goto(page.url());
  await expect(other.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Nguyễn Minh An",
  );
  await page
    .getByLabel("Chức danh / vị trí mong muốn", { exact: true })
    .fill("Kỹ sư phần mềm cao cấp");
  await page.getByRole("button", { name: "Lưu ngay", exact: true }).click();
  await expect(page.locator(".resume-save-status")).toHaveText("Đã lưu");
  await other
    .getByLabel("Chức danh / vị trí mong muốn", { exact: true })
    .fill("Nội dung chưa lưu từ tab thứ hai");
  await other.getByRole("button", { name: "Lưu ngay", exact: true }).click();
  await expect(other.locator(".resume-save-status")).toHaveText(
    "Có xung đột phiên bản",
  );
  await expect(
    other.getByLabel("Chức danh / vị trí mong muốn", { exact: true }),
  ).toHaveValue("Nội dung chưa lưu từ tab thứ hai");
  await other
    .getByRole("button", { name: "Lưu thành CV mới", exact: true })
    .click();
  await expect(other).not.toHaveURL(page.url());
  await expect(
    other.getByLabel("Chức danh / vị trí mong muốn", { exact: true }),
  ).toHaveValue("Nội dung chưa lưu từ tab thứ hai");
  await other.reload();
  await expect(
    other.getByLabel("Chức danh / vị trí mong muốn", { exact: true }),
  ).toHaveValue("Nội dung chưa lưu từ tab thứ hai");
  const copyId = other.url().match(/resumes\/(\d+)/)![1];
  await other.close();
  await page.request.delete(`/api/backend/candidate/resumes/${copyId}`, {
    headers: { Origin: "http://localhost:3127" },
  });
  await page.getByRole("button", { name: "Xuất PDF", exact: true }).click();
  await expect(page.locator(".resume-export-status")).toContainText(
    "Đang tạo PDF",
  );
  execFileSync(
    process.env.PHP_BINARY || "php",
    ["../backend/scripts/frontend-e2e-cv-worker.php"],
    { timeout: 45000 },
  );
  await expect(
    page.getByRole("link", { name: "Tải PDF", exact: true }),
  ).toBeVisible({
    timeout: 15000,
  });
  const pdfUrl = await page
    .getByRole("link", { name: "Xem PDF", exact: true })
    .getAttribute("href");
  const pdf = await page.request.get(pdfUrl!);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Tải PDF", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^CV-\d+\.pdf$/);
  const downloadedPath = info.outputPath(download.suggestedFilename());
  await download.saveAs(downloadedPath);
  expect(readFileSync(downloadedPath)).toEqual(await pdf.body());
  await page.screenshot({
    path: info.outputPath("editor-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 900 });
  await expect(
    page.getByRole("tab", { name: "Nội dung", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await expect(page.getByLabel("Họ và tên", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Xem trước", exact: true }).click();
  await expect(page.getByTitle("Bản PDF xem trước")).toBeVisible();
  await expectPaintedPdf(page);
  await page.screenshot({
    path: info.outputPath("editor-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Nội dung", exact: true }).click();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .disableRules(["frame-tested"])
    .analyze();
  expect(axe.violations).toEqual([]);
  const fixture = JSON.parse(
    readFileSync(
      "../backend/storage/framework/testing/frontend-e2e/fixture.json",
      "utf8",
    ),
  );
  await page.goto(`/jobs/${fixture.job_id || fixture.job || 1}`);
  await page
    .getByRole("button", { name: "Ứng tuyển ngay", exact: true })
    .click();
  await page.getByRole("radio", { name: /CV tạo trên TimViecOnline/ }).check();
  const exportOption = page
    .getByLabel("CV đã tạo", { exact: true })
    .getByRole("option", { name: /CV kiểm thử trình duyệt/ });
  await expect(exportOption).toHaveCount(1);
  await page
    .getByLabel("CV đã tạo", { exact: true })
    .selectOption((await exportOption.getAttribute("value"))!);
  await page
    .getByRole("button", { name: "Xác nhận ứng tuyển", exact: true })
    .click();
  await expect(page.getByRole("link", { name: /Đã ứng tuyển/ })).toBeVisible();
  const deleted = await page.request.delete(
    `/api/backend/candidate/resumes/${resumeId}`,
    { headers: { Origin: "http://localhost:3127" } },
  );
  expect(deleted.status()).toBe(200);
  const history = await page.request.get("/api/backend/candidate/applications");
  const body = await history.json();
  const application = body.data.find(
    (item: { job_id: number }) =>
      item.job_id === (fixture.job_id || fixture.job || 1),
  );
  expect(application).toBeTruthy();
  const stored = await page.request.get(
    `/api/backend/applications/${application.id}/cv`,
  );
  expect(stored.status()).toBe(200);
  expect((await stored.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const employerLogin = await page.request.post(
    "http://127.0.0.1:8127/api/login",
    {
      data: { email: "employer@frontend-e2e.test", password: "BrowserTest1!" },
    },
  );
  expect(employerLogin.ok()).toBeTruthy();
  const employerToken = (await employerLogin.json()).data.token;
  const employerPdf = await page.request.get(
    `http://127.0.0.1:8127/api/applications/${application.id}/cv`,
    { headers: { Authorization: `Bearer ${employerToken}` } },
  );
  expect(employerPdf.status()).toBe(200);
  expect(await employerPdf.body()).toEqual(await stored.body());
});
