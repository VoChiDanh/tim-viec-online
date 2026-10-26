import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("legacy company directory URLs lead to the shared home section", async ({
  page,
}) => {
  for (const path of [
    "/companies",
    "/companies?keyword=FPT&sector=retail&page=3",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/#top-companies$/);
    await expect(page.locator("#top-companies")).toBeVisible();
    await expect(page.locator(".company-search")).toHaveCount(0);
  }
});

test("each featured company has its own profile and consistent open-job count", async ({
  page,
}) => {
  const companies = [
    { id: 1, name: "FPT Software", count: 3 },
    { id: 201, name: "Tập đoàn Viettel", count: 0 },
    { id: 202, name: "Vinamilk", count: 0 },
    { id: 203, name: "Techcombank", count: 0 },
    { id: 204, name: "Shopee Vietnam", count: 0 },
    { id: 205, name: "Vingroup", count: 0 },
  ];
  for (const company of companies) {
    await page.goto("/");
    await page
      .locator(`#top-companies a[href="/companies/${company.id}"]`)
      .click();
    await expect(page).toHaveURL(new RegExp(`/companies/${company.id}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: company.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("company-job-card")).toHaveCount(
      company.count,
    );
    await expect(
      page.getByRole("link", {
        name: `Xem ${company.count} việc làm`,
        exact: true,
      }),
    ).toBeVisible();
    if (!company.count)
      await expect(
        page.getByRole("heading", {
          name: "Chưa có vị trí đang tuyển",
          exact: true,
        }),
      ).toBeVisible();
  }
});

test("company vacancies exclude closed jobs and link to the correct job and company", async ({
  page,
}) => {
  await page.goto("/companies/1");
  await expect(page.getByTestId("company-job-card")).toHaveCount(3);
  await expect(
    page.getByText("Đợt tuyển dụng đã đóng", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /fptsoftware\.com/ }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await page
    .getByTestId("company-job-card")
    .first()
    .getByRole("link", { name: "Xem việc làm", exact: true })
    .click();
  await expect(page).toHaveURL(/\/jobs\/1$/);
  await page
    .locator(".detail-heading .company-name")
    .getByRole("link", { name: "FPT Software", exact: true })
    .click();
  await expect(page).toHaveURL(/\/companies\/1$/);
  await page
    .getByRole("button", { name: "Lưu việc làm", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Lưu việc làm", exact: true }).first(),
  ).toBeFocused();
});

test("company discovery uses the shared home and sharing copies the profile URL", async ({
  page,
  context,
}) => {
  await page.goto("/jobs");
  await page
    .getByRole("button", { name: "Tất cả danh mục", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Khám phá doanh nghiệp", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#top-companies$/);
  await page.locator('#top-companies a[href="/companies/1"]').click();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .getByRole("button", { name: "Chia sẻ hồ sơ", exact: true })
    .click();
  await expect(
    page.getByText("Đã sao chép liên kết hồ sơ công ty.", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    new URL("/companies/1", page.url()).href,
  );
});

test("missing or malformed company IDs show a useful not-found state", async ({
  page,
}) => {
  for (const id of ["invalid", "0", "01", "999999", "9007199254740993"]) {
    await page.goto(`/companies/${id}`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Không tìm thấy doanh nghiệp",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Khám phá doanh nghiệp",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );
  }
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`company pages fit ${width}px and retain accessible structure`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/companies/1", "/companies/201"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      if (width === 360 || width === 1440) {
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: testInfo.outputPath(`${path.replaceAll("/", "-")}.png`),
          fullPage: true,
        });
      }
    }
  });
}
