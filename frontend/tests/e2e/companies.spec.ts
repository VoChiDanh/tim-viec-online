import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("company directory paginates all companies without repeating cards", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#top-companies .home-company-card")).toHaveCount(
    6,
  );
  await page
    .locator("#top-companies")
    .getByRole("link", { name: "Xem Tất Cả", exact: true })
    .click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Khám phá doanh nghiệp tuyển dụng",
      exact: true,
    }),
  ).toBeVisible();
  const cards = page.locator(".company-directory-card");
  await expect(cards).toHaveCount(12);
  await expect(page.locator(".company-directory-range")).toHaveText(
    "Hiển thị 1–12 / 17",
  );
  const firstPageLinks = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  const pagination = page.getByRole("navigation", {
    name: "Phân trang doanh nghiệp",
    exact: true,
  });
  await pagination.getByRole("link", { name: "Trang 2", exact: true }).click();
  await expect(page).toHaveURL(/\/companies\?page=2$/);
  await expect(cards).toHaveCount(5);
  await expect(page.locator(".company-directory-range")).toHaveText(
    "Hiển thị 13–17 / 17",
  );
  const secondPageLinks = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );
  expect(new Set([...firstPageLinks, ...secondPageLinks]).size).toBe(17);
  await expect(
    pagination.getByRole("link", { name: "Trang 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await pagination
    .getByRole("link", { name: "Trang đầu", exact: true })
    .click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(cards).toHaveCount(12);
});

test("company search resets pagination and opens the matching profile", async ({
  page,
}) => {
  await page.goto("/companies?page=2");
  const search = page.getByRole("search", { name: "Tìm kiếm doanh nghiệp" });
  await search.getByLabel("Tên công ty hoặc từ khóa").fill("FPT");
  await search.getByRole("button", { name: "Tìm doanh nghiệp" }).click();
  const query = new URL(page.url()).searchParams;
  expect(query.get("keyword")).toBe("FPT");
  expect(query.has("page")).toBe(false);
  await expect(page.locator(".company-directory-card")).toHaveCount(1);
  await expect(page.locator(".company-directory-card")).toContainText(
    "FPT Software",
  );
  await expect(
    page.getByRole("navigation", { name: "Phân trang doanh nghiệp" }),
  ).toHaveCount(0);
  await page.locator('.company-directory-card[href="/companies/1"]').click();
  await expect(page).toHaveURL(/\/companies\/1$/);
  await page
    .getByRole("navigation", { name: "Đường dẫn" })
    .getByRole("link", { name: "Doanh nghiệp tuyển dụng" })
    .click();
  await expect(page).toHaveURL(/\/companies$/);
});

test("company search has a recoverable empty state and bounds invalid pages", async ({
  page,
}) => {
  await page.goto("/companies?keyword=company-that-does-not-exist&page=3");
  await expect(
    page.getByRole("heading", {
      name: "Không tìm thấy doanh nghiệp phù hợp",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".company-directory-card")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Phân trang doanh nghiệp" }),
  ).toHaveCount(0);
  await page
    .locator(".empty-state")
    .getByRole("link", { name: "Xóa bộ lọc" })
    .click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(page.getByLabel("Tên công ty hoặc từ khóa")).toHaveValue("");
  await expect(
    page.getByLabel("Tỉnh / Thành phố", { exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".company-directory-card")).toHaveCount(12);
  for (const invalidPage of ["0", "-1", "invalid"]) {
    await page.goto(`/companies?page=${invalidPage}`);
    await expect(page.locator(".company-directory-range")).toHaveText(
      "Hiển thị 1–12 / 17",
    );
  }
  await page.goto("/companies?page=9999");
  await expect(page.locator(".company-directory-range")).toHaveText(
    "Hiển thị 13–17 / 17",
  );
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
    .getByRole("link", { name: "Lưu việc làm", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fjobs%2F1$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("company discovery opens the directory and sharing copies the profile URL", async ({
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
  await expect(page).toHaveURL(/\/companies$/);
  await page.getByLabel("Tên công ty hoặc từ khóa").fill("FPT");
  await page.getByRole("button", { name: "Tìm doanh nghiệp" }).click();
  await page.locator('.company-directory-card[href="/companies/1"]').click();
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
    for (const path of ["/companies", "/companies/1", "/companies/201"]) {
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
