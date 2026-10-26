import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const mailbox = path.resolve(
  "../backend/storage/framework/testing/frontend-e2e/mailbox.jsonl",
);
type Letter = { recipients: string[]; raw: string };
const letters = (email: string): Letter[] =>
  existsSync(mailbox)
    ? readFileSync(mailbox, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Letter)
        .filter((letter) => letter.recipients.includes(email))
    : [];
function decoded(letter: Letter) {
  return Buffer.from(
    letter.raw
      .replace(/=\r\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      ),
    "binary",
  ).toString("utf8");
}

test("real SMTP delivers welcome and recovery mail; browser resets once and logs in with the new password", async ({
  page,
}) => {
  const email = "recovery@frontend-e2e.test";
  const original = "OriginalPass1!";
  const changed = "ChangedPass2!";
  await page.goto("/register");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Người nhận email");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel(/^Ngày sinh/).fill("20/05/2000");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(original);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(original);
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?notice=registered$/);
  await expect.poll(() => letters(email).length).toBe(1);
  expect(decoded(letters(email)[0])).toContain("http://localhost:3127/login");
  expect(letters(email)[0].raw).toContain("multipart/alternative");
  expect(letters(email)[0].raw).not.toContain(original);

  await page.goto("/forgot-password");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Gửi liên kết khôi phục", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Nếu email đã đăng ký");
  await expect.poll(() => letters(email).length).toBe(2);
  const resetMail = letters(email)[1];
  expect(resetMail.raw).toContain("multipart/alternative");
  const source = decoded(resetMail);
  expect(source).toContain("15 phút");
  const resetUrl = source
    .match(/href="([^"]*\/reset-password\?[^\"]+)"/)?.[1]
    ?.replaceAll("&amp;", "&");
  expect(resetUrl).toBeTruthy();
  expect(new URL(resetUrl!).origin).toBe("http://localhost:3127");
  const reset = new URL(resetUrl!);
  const token = reset.searchParams.get("token")!;
  await page.goto(resetUrl!);
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(changed);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(changed);
  await page
    .getByRole("button", { name: "Đặt lại mật khẩu", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?notice=reset$/);
  await expect(page.getByRole("status")).toContainText(
    "Đặt lại mật khẩu thành công",
  );
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(changed);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  expect(
    (
      await page.request.post("http://127.0.0.1:8127/api/login", {
        data: { email, password: original },
      })
    ).status(),
  ).toBe(401);
  await page.goto(resetUrl!);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Liên kết xác thực đã hết hạn hoặc không hợp lệ",
  );
  await expect(
    page.getByRole("link", { name: "Yêu cầu liên kết mới", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toHaveCount(0);
  const reused = await page.request.post(
    "http://127.0.0.1:8127/api/reset-password",
    {
      data: {
        email,
        token,
        password: original,
        password_confirmation: original,
      },
    },
  );
  expect(reused.status()).toBe(400);
  expect((await reused.json()).code).toBe("invalid_reset_token");
});
