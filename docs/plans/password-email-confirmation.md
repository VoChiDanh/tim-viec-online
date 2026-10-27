# Password changes confirmed by email

**Goal:** Require proof of mailbox access before applying a password change; retain the existing forgot-password email workflow.

**Scope:** SRS FR-02.7–02.9, extended by the user's request on 27/10/2026. Use the configured SMTP provider, including Gmail. Never reset the live database or send test mail to external recipients.

## Contract and design

- Authenticated `PUT /user/change-password` validates the current/new passwords and stages only a new password hash, a credential fingerprint, an email/user binding and a hashed 64-character token. Return 202 `data:{confirmation_required:true,email}`. Keep current credentials/sessions until confirmation. SMTP failure returns a safe 503 and removes only the undelivered request.
- Email links to `/confirm-password-change?email=...&token=...`, valid 15 minutes. GET/render never applies the change. Public `POST /password/change/confirm {email,token}` returns `data:{confirmed:true,email}` or 400 `invalid_password_change_token`.
- Confirmation requires the same user, current email and unchanged credentials, atomically consumes the request, updates the password, clears reset/pending tokens and revokes all sessions. Old/expired/replaced links fail. Email edits invalidate pending change/reset links, including A → B → A.
- Recovery tokens gain user/credential binding through an additive migration. Lock user before tokens in issuance/consumption; serialize login's password check and token issuance against changes.
- Preserve the existing separate registration-verification policy: recovery/change does not set `email_verified_at`. The optional clarification about unifying these remains unanswered; no automatic policy change is inferred. No password change occurs on request issuance or merely opening links.
- Explicit account/IP throttles, password-policy parity, safe HTML/text and no secrets in logs/serialized queue payloads.

## Execution

- [x] Write and run failing backend security tests before implementation.
- [x] Implement migration, service, requests, controller/routes/mail and recovery hardening; run focused tests and commit.
- [x] Implement frontend pending/success/error/expired states, confirmation action and strict contracts; preserve preview behavior; verify and commit.
- [x] Exercise request → local SMTP → explicit browser confirmation → login/replay with real Laravel and isolated database.
- [x] Run backend regression, frontend unit/server/browser checks, lint/typecheck/build; independent security review and fixes.
- [x] Apply additive local migration only, document behavior and commit without environment files or unrelated demo-data edits. Existing notification worker is unaffected; confirmation mail is synchronous.

## Review focus

Password/request hashes must never reach API output; mail scanners must not consume links; two requests, resets and email edits must invalidate stale changes; wrong-token attempts must not consume valid requests; SMTP failure must preserve current credentials; locked accounts must stay locked; confirmation in a browser signed into someone else must not revoke that browser's unrelated session.

## Review and verification — 27/10/2026

- Eight initial security tests failed against immediate-change behavior, then passed against staged confirmation. Added coverage for stale credentials, reassigned mailboxes, purpose isolation, legacy reset rejection, escaped multipart content and older SMTP failures preserving newer requests.
- Review found admin lock handlers revoked tokens before updating status outside a transaction. Four deterministic regressions reproduced the login interleaving and partial-failure problems. Both handlers now lock the user and update status/revoke tokens atomically; no separate-connection concurrency benchmark is claimed.
- Review found profile cleanup could use a stale request email and delete another mailbox owner's reset request. A failing regression now passes: cleanup uses the locked row's original email and limits legacy email cleanup to unbound records.
- Frontend: 115 unit tests, 11 server/auth tests, TypeScript, focused ESLint and production build pass. Auth browser suite: 27/27 pass, including mobile/accessibility, GET non-consumption, purpose-specific errors, cross-origin rejection and preservation of an unrelated account's browser session.
- Backend full suite: 118 tests / 1,365 assertions pass on disposable `pr3_review_test` MySQL at port 33063. This includes the four admin-lock regressions and twelve password-confirmation tests.
- Real Laravel/Reverb/SMTP browser suite: 12/12 pass. New password-change case verifies MIME HTML/text, absence of passwords in mail, old-password validity before confirmation, GET/reload non-consumption, explicit POST, three API sessions plus browser session revoked, new-password login and replay rejection. Forgot-password SMTP case remains passing.
- Applied only additive migration `2026_10_27_000006_add_password_change_confirmation.php` to the existing local database; no reset or data seeding. `mail:check` reports complete SMTP configuration. Authentication/delivery to an external Gmail inbox has not been tested.
