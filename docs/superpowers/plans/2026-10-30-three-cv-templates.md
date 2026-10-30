# Three Additional CV Templates Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan inline. Preserve existing uncommitted UI fixes; do not commit or reset the live database.

**Goal:** Add three selectable CV layouts with matching covers, browser previews and exported PDFs.

**Architecture:** Extend the existing version-1 template catalog and validation allowlists. All six layouts share the existing React PDF document, content schema, private assets and export queue. No database migration or dependency is needed.

**Tech Stack:** Next.js, TypeScript, React PDF, Laravel, MySQL, PyMuPDF.

**Spec:** `docs/SRS.md` FR-03.7 through FR-03.13 plus the scope below.

## Scope and design

- `executive` / Điều hành: dark header with white identity text, single-column work history.
- `elegant` / Thanh lịch: thin page accent, spacious identity, fine timeline rules beside entries.
- `technical` / Chuyên môn: main narrative at left, tinted skills/languages column at right; sparse profiles use one column.
- Preserve all three existing layouts and existing documents. Template switches retain all content, settings and photos.
- Keep the bundled Vietnamese font and existing blue/teal/slate palettes, font sizes and line spacing.
- Covers are rendered from the actual shared showcase document, never separately illustrated approximations.

## Global constraints

- Private, owner-scoped CV data; no AI calls, external fonts or network assets.
- PDF A4, selectable Vietnamese text, maximum 5 pages and 5 MB under existing validation.
- Backend allows only six known keys; schema/template version remains 1.
- Use an explicitly isolated test database for Laravel tests. Never migrate, reset or seed the live database.

## Review focus

- Long contact strings and names must stay inside printable margins.
- Long or sparse profiles must not lose sections or produce empty trailing pages.
- Changing templates, hiding sections and reordering sections must preserve content.
- Browser worker and server export must render the same layout.
- Preview images must match layouts and remain sharp at card size on mobile and desktop.

## Tasks

- [x] 1. Add failing catalog/schema and API lifecycle checks; extend schema, backend allowlists and frontend labels to six templates.
- [x] 2. Add PDF layout-distinction checks; implement three layouts while keeping existing rendering tests green.
- [x] 3. Render all covers, add static image imports, and expose the new choices in the existing library/editor.
- [x] 4. Verify unit, renderer, browser worker, isolated backend tests, production build and real browser create/save/switch/export flows. Inspect generated PDFs and mobile/desktop cards, clean disposable fixtures and record results.

## Execution ledger

- Initial state: branch `feature/cv-builder`; unrelated UI fixes remain in the working tree.
- Authorization: user explicitly requested implementation; proceed with the three complementary layouts above using existing product constraints.
- Catalog/schema tests failed on the missing three keys before implementation. PDF geometry checks then failed on classic fallback before the new layouts were implemented.
- Reduced executive heading/header spacing after the showcase initially overflowed to two pages; all three new showcase PDFs now fit one page without shrinking the body font.
- MySQL reorders JSON object keys, so API copy verification compares content by value instead of insertion order.
- Final checks: 136 frontend unit tests; 8 renderer tests; six browser-worker templates; 22 isolated Laravel Resume tests / 218 assertions; production build and scoped lint/Pint pass.
- Browser: created and exported all three new templates, then uploaded a private image, edited the name, switched all six templates and reloaded without losing content; downloaded three PDFs with the expected Unicode filename. Mobile cards and axe pass. Disposable fixture cleanup completed.
- Fresh read-only review found no blocking defect; its photo and sparse-technical coverage suggestions are included in the final checks.
