# Backend Testing Guide

Hướng dẫn kiểm tra backend theo [SRS](docs/SRS.md), routes hiện tại và contract ở [API_CHECKLIST.md](API_CHECKLIST.md). Một test chỉ được coi là đạt khi đúng status + response + DB/file/event side effects + quyền truy cập.

## 1. Trạng thái môi trường

Rà soát code đã kiểm tra PHP syntax ở các file sửa, route bootstrap, lệnh chuyển CV legacy và status migration. Runtime có PDO MySQL, không có `pdo_sqlite`; database mặc định chưa migrate. Vì vậy chưa chạy migration trên DB mặc định hoặc test endpoint có ghi dữ liệu. `backend/test_all_backend.php` cũ có side effects/xóa token, không chạy trên dữ liệu người dùng và không coi là suite đáng tin.

Các lệnh an toàn/ý nghĩa:

```powershell
cd backend
php artisan route:list --path=api
php artisan migrate:status
php artisan test
composer validate --no-check-publish
```

`php artisan test` hiện chỉ có test ví dụ Laravel, không bao phủ FR. Muốn test migration cần MySQL disposable mới, hoặc cài SQLite driver ở môi trường riêng.

## 2. Tạo môi trường test cô lập

1. Tạo database riêng, ví dụ `tim_viec_online_test`; cấu hình `.env.testing` không dùng production credentials/data.
2. Chọn `MAIL_MAILER=array`, `QUEUE_CONNECTION=sync` (hoặc database queue với worker test), `BROADCAST_CONNECTION=log`, `FILESYSTEM_DISK=local`, bỏ Gemini key thật.
3. Trước `migrate:fresh`, xác minh `DB_DATABASE` là database test disposable. Chạy `php artisan migrate:fresh --seed --env=testing`.
4. Tạo fixture candidate/employer/admin, company hoàn chỉnh, category/skills/job, PDF synthetic. Dùng transaction/teardown và `Storage::fake`, `Mail::fake`, `Http::fake`, `Event::fake`.
5. Không dùng CV thật, gửi mail thật, Reverb public endpoint hoặc Gemini có tính phí trong unit/feature test.

Mỗi case nên lưu request (đã loại secret), response/status, database snapshot/assertions, logs và environment/version. Smoke test production chỉ đọc trước; thao tác ghi phải có dữ liệu test được phê duyệt.

## 3. Ma trận kiểm tra theo FR

### FR-01 Register

- Candidate/employer hợp lệ: 201, user role chính xác, password hash, profile/company được tạo cùng transaction, response không có token/password.
- Duplicate email kể cả khác hoa thường; email sai; role admin; name boundary/ký tự; password min/max/complexity/confirmation; phone; thiếu DOB, DOB đủ 15 tuổi và trẻ hơn 15.
- Mail thành công và thất bại: lỗi mail không tạo password/token leak; client điều hướng login. Rate limit 5/phút.

### FR-02 Login, lockout, reset

- Email không tồn tại/sai password cùng status/message; 4 lần sai chưa lock, lần thứ 5 lock 15 phút, đúng password reset count; lock hết hạn được login. Dùng frozen clock.
- Admin lock/unlock; lock thu hồi mọi Sanctum token. Logout chỉ thu hồi token hiện hành.
- Forgot email tồn tại/không tồn tại cùng response genérico; rate limit; reset mail chỉ chứa raw token/link; response API không có `token`/`reset_url`; DB chỉ giữ hash.
- Verify/reset valid, sai email/token, hết hạn ở biên, token dùng lại, password rules, reset thu hồi toàn bộ token. Change password: current sai, confirmation, new==old, token hiện tại giữ lại và token khác bị thu hồi.
- Mail lỗi được log, không tiết lộ account existence. Email cảnh báo lock là deferred theo SRS.

### FR-03 Candidate profile/CV

- Candidate chỉ xem/sửa profile của chính mình; email uniqueness/normalization, DOB >=15, skill IDs tồn tại, max 10, empty list sync.
- PDF valid, extension/MIME giả, empty/corrupt/scanned, >5MB; avatar allowed type/2MB; storage fail; thay/xóa file cũ.
- Candidate CV endpoint chỉ trả CV của token hiện tại. Application CV: owner candidate, đúng employer company, admin được phép; guest/other employer/other candidate bị từ chối. Xác nhận `Content-Type`, `Cache-Control: private, no-store`, không có public URL.
- Chạy migration legacy trên bản sao data; kiểm tra SHA-256 giống; thử rollback/restore trước `--delete-source`; kiểm tra direct `/storage` không còn phục vụ CV sau migration.

### FR-04 Company/job

- Company completion gate; employer không sửa job công ty khác. Job title/category/type/quantity/deadline/city/skills, `salary_type`, negotiation, min/max, min>max và biên zero.
- Deadline hôm qua bị từ chối, hôm nay dùng hết ngày; public list loại closed/expired; close chặn apply/ẩn list; reopen rules; detail và existing conversations/applications theo SRS.
- `php artisan jobs:expire` chỉ đổi active job quá hạn sang `expired`; chạy lặp lại không tạo side effect khác. Schedule chạy 00:05 mỗi ngày; kiểm tra scheduler trên staging.
- Migration fresh tạo đủ FK/index/unique; rollback domain migration đúng thứ tự; seed chạy từ DB sạch. So sánh schema dump và migrations.

### FR-05 Search/save

- Keyword title/company/skill, Unicode/có dấu/không dấu; category scalar/comma/array; city, job type, skill IDs; invalid ids/type/page/per_page.
- Salary `under_10`, `10_20`, `over_20`, `negotiable`; test ranh giới 10m/20m, min-only, null max, hidden/negotiated.
- Sort/pagination; save idempotent; unsave missing; role guard; only active job. Xác nhận DB indexes bằng explain và benchmark riêng khi có data representative.

### FR-06 Applications

- Guest 401; employer/admin 403; candidate no profile/no CV; profile CV/new CV; invalid CV; inactive/past deadline; self apply; duplicate including withdrawn; concurrent duplicate requests chỉ tạo 1 row.
- Employer list/detail chỉ thuộc job mình; first view `applied→waiting` và reviewed timestamp; trạng thái cho phép/không cho phép; notification gửi đúng người.
- Withdraw chỉ `applied` và chưa review; không rút waiting/accepted/rejected. Inject queue failure sau lưu: đơn vẫn có trạng thái pending/failed theo policy, không trả lỗi gây client gửi trùng.
- Xác nhận policy `withdrawn` không được apply lại; SRS hiện ghi rõ 5 trạng thái và quy tắc này.

### FR-07 AI

- Queue dispatch sau apply; status pending/completed/failed; GET trả 202/200/422 tương ứng; POST retry không tạo duplicate analysis.
- `Http::fake`: Gemini JSON hợp lệ, malformed/missing fields, non-2xx, timeout, empty key; fallback output trong 0–100, private CV đọc được, provider errors không leak.
- PDF text extraction; scanned/empty/corrupt thông báo rõ; summary/skills/recommendation criteria; job timeout/retry/failed_jobs; worker offline/backlog behavior.
- Live Gemini chỉ dùng CV tổng hợp, theo dõi quota, latency và model configured; không chấm quyết định tuyển dụng tự động.

### FR-08 Chat

- Tạo conversation chỉ từ application hợp lệ, candidate/employer đúng cặp; người ngoài không list/read/send/join private channel.
- Message 1..1000, trim/blank, image-only, message+image, invalid mime/size, storage failure; message DB nullable; image URL/access policy.
- Read receipt chỉ đánh dấu inbound; channel auth `/api/broadcasting/auth`; DB commit và event broadcast assertions riêng; Reverb down không làm mất message, log thể hiện lỗi realtime.
- Chat image download chỉ cho thành viên conversation; direct `/storage/chat_images/...` không phục vụ file mới; legacy images cần chuyển bằng `storage:secure-legacy-cvs`.
- Đo thời gian đầu-cuối để xác nhận SRS <1s với Reverb/client thực.

### FR-09 Admin / reports

- Không admin 403 cho tất cả admin routes; admin list/detail/delete job, lock/unlock user, categories/skills CRUD, stats date range.
- Submit report requires auth/reason/detail; invalid job, self-report company job, duplicate 409, report status pending và `is_reported=true`.
- Admin resolve/dismiss, reviewer/timestamp; job flag giữ khi còn pending, clear khi không còn; người không admin không xử lý report.

### FR-10 Notifications

- Trigger apply/status/chat/security/admin; receiver/content/type/data; list pagination/unread; mark one/all; delete own only; another user's ID inaccessible.
- Assert event once; Reverb failure vs DB persistence; query filters validate; no duplicate on retry where applicable.

## 4. Non-functional / security checks

- Authz matrix: unauthenticated 401, wrong role 403, wrong owner/member 403/404; no existence/data leak.
- SQLi inputs use bound queries; output escaping/XSS must be verified in frontend. File upload MIME + size + private cache policy; secrets/tokens absent from logs/response.
- NFR load: agreed dataset, 50 concurrent, p95 <=1.5s, error rate, queue impact; chat <1s; uptime 99% over agreed window. These are environment measurements, not established by unit tests.
- Backup/restore: DB + private/public storage, restoration drill and post-restore CV access.

## 5. Không an toàn / cần chú ý

Không chạy `backend/test_all_backend.php`: script legacy mutate/delete account/job/token và không có isolation/cleanup đáng tin. Không chạy `migrate:fresh` vào database có dữ liệu cần giữ. Không xóa legacy public CV bằng `--delete-source` khi chưa backup, copy verification và có rollback.
