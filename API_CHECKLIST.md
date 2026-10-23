# API Checklist — TimViecOnline

Contract kiểm tra lấy từ [backend/routes/api.php](backend/routes/api.php), FormRequest, controller và resource. `?` là tùy chọn; kiểm tra response thật trước khi phát hành OpenAPI chính thức. Auth dùng `Authorization: Bearer <Sanctum token>` và `Accept: application/json`.

## Quy ước chung

- Thành công thường `{success,message?,data?,meta?}`; một số endpoint dùng `pagination`, `unread_count`, `conversation`. Validation thường 422; auth 401; role/ownership 403 hoặc 404 theo endpoint; duplicate application/report 409; pending AI 202.
- JSON dùng `application/json`; upload dùng multipart. Không gửi secret, CV thật hay reset token vào logs.
- Filesystem: CV/chat image private, avatar/logo public. Queue AI cần worker. Broadcast auth: `POST|GET /api/broadcasting/auth` theo channel auth.

## Trạng thái hệ thống đã kiểm tra

- [x] Laravel routes bootstrap, `api/broadcasting/auth`, lệnh `storage:secure-legacy-cvs`.
- [x] PHP syntax cho nhóm file backend đã sửa.
- [x] Migration + SQL dump cập nhật schema nghiệp vụ, queue `queue_jobs`, reports và chat/AI columns.
- [ ] Migration MySQL sạch và seed đã thực thi trong lượt này (DB mặc định chưa migrate; không destructive).
- [ ] Mail SMTP, Gemini thật, Reverb realtime, CV cũ production và NFR load/uptime: cần môi trường tích hợp.
- [ ] FR feature suite: PHPUnit hiện chỉ có ví dụ; không dùng script `test_all_backend.php` legacy có side effects.

## 1. Auth/account

| Method / path | Quyền | Request | Expected contract / kiểm tra |
|---|---|---|---|
| `POST /api/register` | Public, 5/phút | JSON `name`, `email`, `dob` (bắt buộc, >=15 tuổi), `password`, `password_confirmation`, `role=candidate|employer`, `phone?` | 201 user, tạo candidate profile hoặc company trong transaction; không trả token/password. Mail thông báo best-effort; client chuyển login. Invalid/duplicate 422. |
| `POST /api/login` | Public, 10/phút | JSON `email`, `password` | 200 token + user; sai thông tin 401, khóa 403; 5 lỗi khóa 15 phút. |
| `POST /api/logout` | Sanctum | none | 200, revoke token hiện tại. |
| `GET /api/user` | Sanctum | none | 200 current user + role profile/company data. |
| `PUT /api/user/change-password` | Sanctum | `current_password`, `new_password`/`password`, confirmation | Update password, revoke token khác, giữ token hiện tại; current sai/new reuse 400. |
| `POST /api/forgot-password`, `/api/password/forgot` | Public, 3/15 phút | JSON `email` | Cùng thông điệp 200 dù email không tồn tại; token reset chỉ email, DB hash; API không trả raw token/reset_url. |
| `GET/POST /api/verify-reset-token` | Public, 20/phút | query/body `email`,`token` | 200 valid; invalid/expired 400. |
| `POST /api/reset-password`, `/api/password/reset` | Public, 10/phút | `email`,`token`,`password`/`new_password`, confirmation | Reset thành công, xóa reset token và revoke Sanctum tokens; sai/expired 400. |

## 2. Public catalog, company, jobs

| Method / path | Quyền | Inputs | Contract / checklist |
|---|---|---|---|
| `GET /api/categories` | Public | none | Danh sách category/count active jobs. |
| `GET /api/categories/{id}` | Public | path ID | Detail/count; unknown 404. |
| `GET /api/skills` | Public | `keyword?` | Danh sách/tìm skill. |
| `GET /api/skills/{id}` | Public | ID | Detail; unknown 404. |
| `GET /api/companies` | Public | `keyword?`,`city?`,`page?`,`per_page?` max100 | Paginated company list/count active jobs. |
| `GET /api/companies/{id}` | Public | ID | Company + active jobs; unknown 404. |
| `GET /api/locations/cities` | Public | none | Distinct cities from currently active and unexpired jobs; use as city filter choices. |
| `GET /api/jobs` | Public; optional Sanctum | `keyword?`,`category_id?` scalar/comma/array, `city?`,`job_type?`,`salary_range?`,`skill_ids?` comma/array, `page?`,`per_page?` <=100 | Active, not past deadline; title/company/skills search; sort updated; pagination; optional is_saved/is_applied. Invalid filters 422. Test salary aliases/boundaries. |
| `GET /api/jobs/{id}` | Public; optional Sanctum | ID | Job detail and view count; verify closed/expired visibility policy. |
| `POST /api/jobs/{id}/report` | Sanctum | JSON `reason` required <=100, `details?` <=2000 | 201 report pending; one report/user/job; duplicate 409; job owner employer rejected. |

Salary bands accepted by controller include `under_10`/`under_10m`, `10_20`/`10m_20m`, `over_20`/`above_20m`/`above_20`, `negotiable`. Validate min/max and null cases against real fixtures. MySQL collation performs case/accent-insensitive basic comparisons; there is no dedicated transliteration/fuzzy search.

## 3. Candidate profile and files

| Method / path | Quyền | Inputs | Contract / checklist |
|---|---|---|---|
| `GET /api/candidate/profile` | Candidate | none | User/profile/skills; may create empty profile. CV returns protected API URL, not public path. |
| `POST|PUT /api/candidate/profile` | Candidate | multipart/JSON: `name?`,`phone?`,`email?`,`dob?`,`title?`,`experience_years?` 0–50, `bio?` <=2000, `address?`,`city?`,`social_links?`, `skills[]` or `skill_ids[]` <=10, `cv_file?` PDF <=5MB, `avatar?` image <=2MB | 200 updated profile; validates user email/DOB, IDs and file. |
| `POST /api/candidate/cv` | Candidate | multipart `cv_file` PDF <=5MB | Upload private; response has protected `cv_url`. |
| `GET /api/candidate/cv` | Candidate | none | JSON protected URL; 404 no CV. |
| `GET /api/candidate/cv/file` | Candidate | none | Streams own PDF, private/no-store; 404 missing. |
| `DELETE /api/candidate/cv` | Candidate | none | Deletes private file and legacy same-path public copy; idempotent. |
| `POST|DELETE /api/candidate/avatar` | Candidate | multipart image / none | Upload/delete public avatar. |
| `GET /api/candidate/saved-jobs` | Candidate | `page?` | Paginated saved jobs. |
| `POST|DELETE /api/jobs/{id}/save` | Candidate | ID | Save active job / unsave; repeated save safe. |

Legacy CV/chat image conversion: `php artisan storage:secure-legacy-cvs` copies `cvs/`, `application_cvs/`, and `chat_images/` and verifies SHA-256; `--delete-source` removes public copies only after backup/verification. Do not treat returned URLs as public.

## 4. Applications and AI

| Method / path | Quyền | Inputs | Contract / checklist |
|---|---|---|---|
| `POST /api/jobs/{id}/apply` | Sanctum candidate | multipart `cv_source?=profile|default|new`, `cv_file?` PDF <=5MB when new, `cover_letter?` <=3000 | 201 application; no profile/CV or self-apply invalid; job must be active/in deadline; repeat including withdrawn 409; dispatch AI queue. |
| `GET /api/candidate/applications` | Candidate | `status?`,`page?`,`per_page?` | Paginated own history. |
| `DELETE /api/candidate/applications/{id}/withdraw` | Candidate owner | ID | Withdraw only status applied and not reviewed; otherwise 400. |
| `GET /api/employer/jobs/{id}/applications` | Employer owner | `status?`,`page?` | Applicants for owned job only. |
| `GET /api/employer/applications/{id}` | Employer owner | ID | Detail; first view sets waiting/reviewed time. |
| `PATCH /api/employer/applications/{id}/status` | Employer owner | JSON `status=waiting|accepted|rejected` | Update and notify candidate; test transition/idempotency. |
| `GET /api/applications/{id}/cv` | Candidate owner, job employer, admin | ID | Streams application PDF after policy check; unauthorized gets 403/404. |
| `POST /api/applications/{id}/ai-analyze` | Application owner/candidate, job employer, admin | ID | Queue/reuse analysis; pending 202. |
| `GET /api/applications/{id}/ai-analysis` | Same | ID | 200 completed; 202 pending; 422 failed; verify no provider details leak. |

`ai_analysis_status=pending|completed|failed`; worker command `php artisan queue:work --tries=2 --timeout=60`. Without worker, database queue remains pending. Gemini is external; fallback heuristic must be tested separately and is not an employment decision.

## 5. Employer management

| Method / path | Quyền | Inputs | Contract / checklist |
|---|---|---|---|
| `GET /api/employer/company` | Employer | none | Current company (may initialize empty record). |
| `POST /api/employer/company` | Employer | `name`,`description`,`address`,`city`, optional size/site/logo | Update company; logo constraints and old file cleanup. |
| `GET /api/employer/my-jobs` | Employer | `page?` | Own paginated jobs. |
| `POST /api/employer/jobs` | Employer | title/category/level/quantity/type/city/deadline/description/requirements/benefits/salary/skills | 201 active job; complete company required; boundary/ownership validation. |
| `PUT /api/employer/jobs/{id}` | Employer owner | job fields | Update owned job and skills. |
| `PATCH /api/employer/jobs/{id}/status` | Employer owner | `status=active|closed`, optional future `deadline` | Close/reopen; verify public visibility and apply behavior. |
| `GET /api/admin/jobs/reported` | Admin | `page?`,`per_page?` <=100 | Paginated jobs with report details. |
| `PATCH /api/admin/jobs/{id}/report` | Admin | `status=resolved|dismissed` | Resolve/dismiss pending reports, reviewer/time; clear job flag only when no pending reports remain. |

Salary type values and required fields are enforced by `JobRequest`; use exact implementation validation when building clients. `salary_min`/`salary_max` are integer amounts in the project’s stored currency unit; confirm UI label is VND.

## 6. Chat, notifications, admin

| Method / path | Quyền | Inputs | Contract / checklist |
|---|---|---|---|
| `GET /api/conversations` | Sanctum | none | Current user's rooms only. |
| `POST /api/conversations` | Candidate/employer | `job_id`,`partner_id` | Room tied to valid application and job owner; membership/role enforced. |
| `GET /api/conversations/{id}/messages` | Room member | `page?`,`per_page?` | Paginated history, inbound read handling. |
| `POST /api/conversations/{id}/messages` | Room member | JSON/multipart `message?` 1–1000, `image?` JPEG/PNG/GIF/WEBP <=5MB; one required | 201; image-only supported; event/notification emitted. DB persistence can succeed if Reverb delivery fails. |
| `GET /api/conversations/{conversationId}/messages/{messageId}/image` | Room member | Path IDs | Streams private image after membership check; 403 other user, 404 missing. |
| `PATCH /api/conversations/{id}/read` | Room member | none | Mark inbound read; broadcast receipt. |
| `GET /api/notifications` | Sanctum | pagination/filter query | Own notifications/unread count. |
| `PATCH /api/notifications/{id}/read` | Sanctum owner | ID | Mark own notification read. |
| `PATCH /api/notifications/read-all` | Sanctum | none | Mark all own notifications read. |
| `DELETE /api/notifications/{id}` | Sanctum owner | ID | Delete own notification. |
| `GET /api/admin/stats` | Admin | `days?` 1–365 | Dashboard aggregates. |
| `GET /api/admin/users`, `/api/admin/users/{id}` | Admin | pagination/filter, ID | User list/detail. |
| `PATCH /api/admin/users/{id}/status`, `/toggle-lock` | Admin | status/action | Lock/unlock/status; verify token revocation and self-lock policy. |
| `GET /api/admin/jobs`, `/api/admin/jobs/{id}` | Admin | query/ID | Job list/detail. |
| `DELETE /api/admin/jobs/{id}` | Admin | ID | Delete with configured cascades/notification. |
| `GET/POST /api/admin/categories`, `PUT|DELETE /api/admin/categories/{id}` | Admin | category data/ID | Taxonomy CRUD; FK restrict behavior. |
| `GET/POST /api/admin/skills`, `PUT|DELETE /api/admin/skills/{id}` | Admin | skill data/ID | Taxonomy CRUD; pivot behavior. |
| `GET/POST /api/broadcasting/auth` | Sanctum | channel auth payload | Authorize private chat membership; test wrong user denial. |

## 7. Further checks

- CORS origin matches frontend; Reverb `REVERB_ALLOWED_ORIGINS` must not be wildcard in production.
- Validate status/shape/DB side effects/authorization for every row. For full FR scenarios see [BACKEND_TESTING_GUIDE.md](BACKEND_TESTING_GUIDE.md).
- Performance SRS targets (50 concurrent, p95 1.5s, chat <1s, uptime 99%) remain unverified until measured in a representative deployment.
