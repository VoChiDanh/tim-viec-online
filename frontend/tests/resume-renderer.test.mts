import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyResume, TEMPLATE_KEYS } from "../src/features/resumes/schema";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
execFileSync(process.execPath, ["scripts/build-cv-renderer.mjs"], {
  cwd: root,
});
test("all templates create paged Vietnamese text PDFs using local fonts", async () => {
  const output = path.join(root, "test-results/resume-renderer");
  await mkdir(output, { recursive: true });
  for (const template of TEMPLATE_KEYS) {
    const doc = emptyResume();
    doc.template_key = template;
    doc.content.basics = {
      ...doc.content.basics,
      full_name: "Nguyễn Minh An",
      headline: "Kỹ sư phần mềm",
      email: "an@example.test",
      summary:
        "Phát triển ứng dụng phục vụ cộng đồng, tối ưu hiệu suất hệ thống.",
    };
    doc.content.skills.push({
      id: crypto.randomUUID(),
      name: "TypeScript",
      detail: "Laravel, cơ sở dữ liệu MySQL",
    });
    doc.content.experience = Array.from({ length: 10 }, (_, i) => ({
      id: crypto.randomUUID(),
      company: `Doanh nghiệp tổng hợp ${i + 1}`,
      position: "Lập trình viên",
      start_month: "2023-01",
      end_month: "2025-12",
      current: false,
      description:
        "Phân tích yêu cầu và xây dựng hệ thống quản lý tuyển dụng. Kiểm thử, triển khai và bảo trì ứng dụng cho người dùng Việt Nam. ".repeat(
          5,
        ),
    }));
    const file = path.join(
      output,
      template + "-" + crypto.randomUUID() + ".pdf",
    );
    execFileSync(
      process.execPath,
      [path.join(root, "dist/cv-renderer/render-cv.mjs"), file],
      { input: JSON.stringify({ document: doc }) },
    );
    const result = await readFile(file);
    assert.ok(result.subarray(0, 5).toString() === "%PDF-");
    assert.ok(result.length < 5 * 1024 * 1024);
    const php =
      process.env.PHP_BINARY ||
      (process.platform === "win32" ? "F:/ACode/xampp/php/php.exe" : "php");
    const parsed = JSON.parse(
      execFileSync(
        php,
        [path.join(root, "../backend/scripts/inspect-resume-pdf.php"), file],
        { encoding: "utf8" },
      ),
    );
    assert.ok(
      parsed.pages >= 2 && parsed.pages <= 5,
      `${template}: ${parsed.pages} pages`,
    );
    assert.match(parsed.text, /Nguyễn Minh An/u);
    assert.match(parsed.text, /TypeScript/);
    assert.match(parsed.text, /Doanh nghiệp tổng hợp 10/u);
  }
});

test("renderer rejects invalid input and never accepts user supplied font or image URLs", async () => {
  const draft = emptyResume();
  assert.throws(() =>
    execFileSync(
      process.execPath,
      [
        path.join(root, "dist/cv-renderer/render-cv.mjs"),
        path.join(root, "test-results/invalid.pdf"),
      ],
      {
        input: JSON.stringify({ document: draft }),
        stdio: ["pipe", "pipe", "pipe"],
      },
    ),
  );
  draft.content.basics.full_name = "Nguyễn Minh An";
  draft.content.basics.headline = "Developer";
  draft.content.basics.email = "an@example.test";
  draft.content.skills.push({
    id: crypto.randomUUID(),
    name: "Laravel",
    detail: "API",
  });
  assert.throws(() =>
    execFileSync(
      process.execPath,
      [
        path.join(root, "dist/cv-renderer/render-cv.mjs"),
        path.join(root, "test-results/invalid-photo.pdf"),
      ],
      {
        input: JSON.stringify({
          document: draft,
          photo: "http://127.0.0.1/private",
        }),
        stdio: ["pipe", "pipe", "pipe"],
      },
    ),
  );
});
