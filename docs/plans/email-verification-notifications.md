# Email verification and notification delivery implementation plan

**Goal:** Verify ownership after registration, then let candidates choose application-status and message emails.

**Spec:** `docs/SRS.md` FR-01/02/08/10, extended by the user's explicit verification policy: allow login; require verification before applications, job publishing and messages.

**Architecture:** Laravel stores hashed, single-use verification tokens and sends a confirmation link to the existing Next.js auth UI. Notification emails use a separate database queue with durable coalescing and delivery-time consent checks; realtime notifications remain immediate.

**Constraints:** Never reset the live database, verify existing accounts by migration, enroll users automatically, commit secrets or include private CV/message content in mail. Existing verified demo fixtures remain verified. No AI changes.

## 1. Verification backend

- [x] Add feature tests for registration, hashed tokens, explicit POST consumption, expiry, replay, resend privacy/rate limits, SMTP failure, email changes and action gates; observe failures.
- [x] Add `email_verification_tokens` migration, service, FormRequests, controller, HTML/text mail and `email.verified` middleware.
- [x] Public `POST /email/verify {email,token}` returns `data:{email,verified:true}`; invalid links return 400 `invalid_verification_token`. `POST /email/resend {email}` always returns `data:{accepted:true}` for valid input, with account/IP throttles.
- [x] Registration sends verification instead of welcome; exposes `email_verified_at` but never token. Email changes revoke verification and old links; unchanged normalized addresses preserve verification.
- [x] Run backend tests against disposable MySQL and commit this slice.

## 2. Verification frontend

- [x] Extend strict auth contracts and registration redirect to `/verify-email?email=...`.
- [x] Add an auth-styled confirmation/resend page. GET/render never consumes a token; origin-checked server action performs POST. Include noindex/no-referrer metadata, success/error/expired states and security-page status.
- [x] Verify frontend contracts and browser register → SMTP sink → confirm → login flow; commit.

## 3. Notification preferences and delivery

- [x] Write tests for opt-in persistence, strict validation, unverified blocking, delivery-time opt-out, unread suppression, coalescing, stale jobs, ownership and retry behavior; observe failures.
- [x] Add nullable `users.email_notifications` (null means both false), delivery records, service/jobs/mail. `GET/PUT /user/email-preferences` returns `{applications:boolean,messages:boolean}`. Unverified users may disable but cannot enable.
- [x] Schedule beside real chat/status events, using explicit database `emails` queue after commit. Debounce messages 60 seconds/status 10 seconds; recheck current recipient, verification, preference, ownership, unread/current status at delivery.
- [x] Enable candidate settings with server persistence, pending/error states and a verification link. Preserve mock mode.
- [x] Run focused tests, integration checks, then commit.

## 4. Release checks and setup

- [x] Review security and cross-layer contracts, run backend suite, frontend unit/server tests, lint/typecheck/build and focused browser SMTP tests.
- [x] Document migration, existing-account verification, SMTP and dedicated queue worker setup. Apply only additive migrations to local database after tests.
- [x] Commit verified changes without staging unrelated `docs/demo-data.md` or environment files.

## Review focus

- Email scanners opening a link must not consume it.
- Replacing an email/link must invalidate the old token, including A → B → A changes.
- Login/password recovery must not implicitly verify ownership or unlock an administrator-locked account.
- Queued messages already read, opted out, superseded or addressed to a changed email must not be delivered.
- SMTP failure must not roll back registration or delay realtime chat.

## Review and verification record — 27/10/2026

- Independent review found profile email changes could bypass resend throttles. Added an account/IP limit shared across both profile aliases; regression observed 200 before the fix and 429 afterwards, without blocking unrelated profile edits.
- Added active-account expiry boundary, wrong-token-then-correct-token and mailbox-binding cases; locked-account checks alone do not prove expiry enforcement.
- Review found stale ownership in candidate React state after an email edit. Profile responses now include the timestamp, saves update it, and settings refresh ownership from the API. Frontend helper regression was observed failing first and now passes.
- Delivery tests cover a stale status hook arriving after a newer status, address changes followed by re-verification, worker lease recovery, retryable sanitized SMTP exceptions, burst coalescing and queue failure preserving chat.
- Backend: 101 tests / 1,201 assertions pass on disposable MySQL `pr3_review_test`, port 33063.
- Frontend: 113 unit tests and 11 server/auth tests pass; TypeScript and production build pass. Focused ESLint is clean; whole-repository lint has two existing warnings in ignored `test-results` artifacts, zero errors.
- Auth browser suite: 23 tests pass. Confirmation GET/reload does not consume tokens; explicit POST succeeds once; expired/replayed/invalid links and cross-origin submissions are covered.
- Real Laravel/Reverb browser suite: 11 tests pass. SMTP sink receives registration verification and password recovery; settings persist and roll back failures. A real database queue worker delivers one coalesced chat email and one status email, checks HTML/text and safe links, and suppresses a message marked read before delivery. All recipients belong to the loopback-only test domain; no external inbox is used.
- Browser harness fixes: scope alerts to the page main region instead of Next.js's route announcer; wait for the retry POST before checking final chat reconciliation; use the immutable submitted-CV fixture after profile replacement tests.
- Local additive migrations applied using explicit paths, preserving the imported database and its historical migration ledger. Dedicated local `emails` worker started. `mail:check` confirms required SMTP configuration; external provider authentication/inbox receipt is not claimed by this check.
