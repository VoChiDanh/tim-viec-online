# Backend Guide — TimViecOnline

Tài liệu này mô tả code backend hiện tại và đối chiếu với [SRS](docs/SRS.md). “Có code” chưa đồng nghĩa đã chứng minh chạy production: MySQL, mail, Gemini, Reverb, di trú file cũ và tải thực cần môi trường tích hợp.

## 1. Kết luận A–Z

- Laravel 11 / PHP 8.2+, Sanctum, MySQL, database queue và Reverb tùy cấu hình. Routes tại `backend/routes/api.php`; validation tại `app/Http/Requests`; nghiệp vụ tại `app/Http/Controllers/Api`; model/resource tại `app/Models` và `app/Http/Resources`.
- Migrations tạo schema nghiệp vụ; queue dùng `queue_jobs`, tách bảng `jobs` tuyển dụng. SQL dump bao gồm `job_reports`, trạng thái AI và chat image/read columns.
- CV và chat image mới lưu private. Candidate CV, application CV và chat image được stream qua endpoint có authorization. CV/chat image cũ còn trong public cần chạy lệnh chuyển đổi rồi mới xóa public source.
- Đã có submit/review reports, async AI, auth rate limits, reset-password anti-enumeration. Còn xác minh tích hợp: migrations trên MySQL sạch, email thật, Gemini, Reverb, race/load/performance và backup/restore.
- Môi trường rà soát có PDO MySQL nhưng không có `pdo_sqlite`. Không chạy migrate/reset trên database mặc định: migrations đang pending và DB có thể có dữ liệu cần giữ.
- Frontend hiện là trang mặc định Next.js, chưa triển khai các màn hình SRS. Vì vậy dự án hiện chưa phải website tuyển dụng hoàn chỉnh dù có backend API tương đối rộng.

## 2. Schema và quan hệ

Bảng chính: `users`, `candidate_profiles`, `companies`, `categories`, `skills`, `candidate_skills`, `jobs`, `job_skills`, `saved_jobs`, `applications`, `ai_cv_analyses`, `conversations`, `messages`, `notifications`, `job_reports`, Sanctum/password reset, cache/session và queue tables. Foreign keys/unique constraints bảo vệ quan hệ; application duy nhất `(job_id,candidate_id)`; report duy nhất `(job_id,reporter_id)`. `messages.message` nullable để hỗ trợ ảnh-only.

Migration order: users → cache → queue/Sanctum → domain. Index chính được đối chiếu với SQL dump. Migrations được thiết kế để tạo schema mới; khi schema đổi phải cập nhật cả migrations và `db/tim_viec_online.sql`. Với DB cũ, backup và so sánh schema/migration ledger trước khi migrate; không tự đánh dấu migration đã chạy.

## 3. Cài đặt và khởi chạy

Yêu cầu PHP 8.2+, Composer, MySQL/MariaDB tương thích Laravel, PDO MySQL, fileinfo và dependencies trong `composer.json`.

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Cấu hình `DB_*`, `APP_URL`, `FRONTEND_URL`, mail, Reverb và Gemini. `.env.example` dùng `utf8mb4_unicode_ci`, database queue `queue_jobs`, mail log, Sanctum 7 ngày, public disk mặc định cho avatar/logo và private disk riêng cho CV/chat image. Không commit `.env`/secret.

Để tạo admin local khi seed, đặt `ADMIN_EMAIL` và `ADMIN_PASSWORD` (tối thiểu 12 ký tự); seeder không đổi role của tài khoản tồn tại. Không dùng demo credential hoặc admin local trên production.

Chỉ trên database dev/test rỗng:

```powershell
php artisan migrate --seed
php artisan storage:link
```

`migrate:fresh --seed` xóa schema/dữ liệu, chỉ dùng DB disposable. SQL dump có seed riêng; không import vào DB cần giữ.

```powershell
php artisan serve --host=127.0.0.1 --port=8000
php artisan queue:work --tries=2 --timeout=60
php artisan reverb:start
php artisan schedule:work
```

Worker cần chạy để AI xử lý nền (database queue); scheduler cần chạy để `jobs:expire` đổi tin quá hạn sang `expired` lúc 00:05. Production cần process manager/cron scheduler, HTTPS, `APP_DEBUG=false`, CORS origin giới hạn, mail transport thật, backup DB/storage và monitoring. Nếu `QUEUE_CONNECTION=sync`, queued work chạy trong tiến trình hiện tại.

## 4. Auth và quyền

Sanctum bearer token; middleware phân vai candidate/employer/admin. Register tạo user + profile/company trong transaction, gửi email best-effort, trả 201 không tự login/token; client điều hướng `/login`. Login lockout 5 lần sai/15 phút. Rate limit: register 5/phút, login 10/phút, forgot 3/15 phút, verify 20/phút, reset 10/phút. Forgot trả cùng thông điệp dù email tồn tại; reset token lưu hash và chỉ gửi qua email; reset thành công thu hồi Sanctum tokens. Đổi mật khẩu thu hồi token khác, giữ token hiện tại. Thời hạn cấu hình `SANCTUM_EXPIRATION`.

Email cảnh báo khóa tài khoản trong SRS được ghi “để sau”, chưa triển khai. Mail errors được log; email thật cần kiểm thử riêng.

## 5. Nghiệp vụ chính

### Jobs/search/apply

Job yêu cầu company hoàn chỉnh, category hợp lệ, salary hợp lệ, deadline sau hôm nay khi tạo/sửa. Public list chỉ active và còn hạn; ngày deadline được tính hết ngày. Search validate category, skills, type, salary band và pagination tối đa 100. MySQL collation hỗ trợ so sánh cơ bản không phân biệt dấu/hoa thường; không có transliteration/fuzzy ranking riêng.

Apply chỉ candidate, job active/trong hạn, chặn mọi lần nộp thứ hai kể cả đã rút. CV upload lưu private. Application tạo, notification và AI dispatch nền; unique DB constraint bảo vệ duplicate. Employer chỉ xem application thuộc company của mình; lần xem đầu chuyển `applied` thành `waiting`; chỉ `applied`, chưa review mới rút được.

### AI

`AnalyzeApplicationCv` chạy qua queue và cập nhật `ai_analysis_status=pending|completed|failed`. GET analysis: `202` pending, `422` failed, `200` hoàn tất. Gemini cấu hình `GEMINI_API_KEY`/`GEMINI_MODEL`, có timeout. Khi key/provider lỗi, fallback heuristic dùng text trích xuất từ PDF và tín hiệu skill/experience; đây là gợi ý, không phải quyết định tuyển dụng. PDF scan/không trích xuất được báo lỗi. Cần test chất lượng, quota và latency riêng.

### CV và chat image privacy

Candidate CV: `GET /api/candidate/cv/file`; application CV: `GET /api/applications/{id}/cv`; chat image: `GET /api/conversations/{conversationId}/messages/{messageId}/image`. Chỉ đúng candidate, employer sở hữu job, admin (application CV), hoặc thành viên conversation (chat image) được tải. File stream dùng `private, no-store`. Avatar/logo vẫn public.

CV/chat image cũ: `php artisan storage:secure-legacy-cvs` chuyển `cvs/`, `application_cvs/` và `chat_images/` từ public sang private, xác thực SHA-256. Lệnh mặc định không xóa source; chỉ dùng `--delete-source` sau backup, xác nhận copy và kiểm tra cache/CDN. Trước khi chạy production cần maintenance/rollback plan.

### Chat/reports/notifications

Conversation chỉ tạo từ application hợp lệ; chỉ member được đọc/ghi/join private channel. Tin text hoặc ảnh; image-only hợp lệ. Message/read/notification dùng broadcast-now; auth route `/api/broadcasting/auth`. Tin nhắn có thể lưu thành công dù Reverb lỗi; monitor DB và realtime riêng.

User đăng nhập report job tại `POST /api/jobs/{id}/report`, một report mỗi user/job; employer không report job mình. Admin xem `GET /api/admin/jobs/reported` và xử lý `PATCH /api/admin/jobs/{id}/report` với `resolved|dismissed`.

## 6. FR/SRS và đánh giá

| FR/NFR | Hiện trạng code | Còn thiếu / cần xác nhận |
|---|---|---|
| FR-01 | Register validation/transaction/email/201; không tự cấp token | Mail thật; màn hình đăng ký/login chưa có ở frontend |
| FR-02 | lockout, rate limits, reset hash/anti-enumeration, revocation | email cảnh báo khóa deferred; frontend reset/login chưa có |
| FR-03 | profile/skills, PDF validation, CV private | frontend profile/CV chưa có; migration file cũ; PDF scan/storage test |
| FR-04 | company/job CRUD, owner, salary/deadline | frontend employer chưa có; expired reopen cần deadline mới |
| FR-05 | filters, salary bands, save/unsave API | UI/search page chưa có; transliteration chuyên biệt/benchmark thiếu |
| FR-06 | apply/duplicate/withdraw/review/status/notifications API | frontend flow chưa có; concurrency/queue test |
| FR-07 | queued analysis/result/fallback | frontend loading/result UI chưa có; Gemini thật/quality/latency |
| FR-08 | auth membership, text/image/read receipts | frontend chat chưa có; Reverb E2E/<1s chưa đo |
| FR-09 | admin moderation/taxonomy/reports APIs | frontend admin chưa có; phiên bản này xử lý report, không duyệt trước khi đăng |
| FR-10 | notification CRUD/read/broadcast | frontend bell/list chưa có; Reverb/event coverage chưa kiểm thử |
| NFR | validation, auth, private files, DB constraints | UI 360px/XSS, p95 50 users, AI <4s, chat <1s, uptime 99% chưa chứng minh |

SRS đã được chỉnh để ghi đúng 5 trạng thái ứng tuyển, làm rõ một ứng viên không nộp lại sau khi rút, quy tắc deadline khi mở lại tin đã hết hạn, và mô tả quản trị báo cáo thay vì approval pending.

## 7. Đánh giá mức đồ án / website thực tế

Backend có cấu trúc API và một số biện pháp bảo mật phù hợp đồ án, nhưng chưa đủ bằng chứng để coi production-ready: chưa có Feature test cho FR, chưa chạy migration thật trên DB sạch, chưa xác minh mail/Gemini/Reverb, chưa đo NFR. Frontend hiện chỉ là boilerplate Next.js, không có màn hình cho bất kỳ persona/FR cốt lõi nào. Vì vậy trạng thái toàn sản phẩm: **chưa đạt mức website tuyển dụng hoàn chỉnh theo SRS**; có thể dùng làm nền backend cho đồ án sau khi hoàn thiện frontend, test và tích hợp.

## 8. Kiểm tra đã chạy và vận hành

Đã chạy trong lượt rà soát: `php -l` cho file PHP đã sửa; `php artisan route:list --path=api` (76 routes); `php artisan migrate --pretend --force` để kiểm tra SQL compile mà không ghi DB; `composer validate`; `php artisan test` (1 test ví dụ pass, 1 deprecated từ vendor Laravel). `migrate:status` cho thấy migrations pending. Đây không phải FR acceptance suite.

Không chạy `backend/test_all_backend.php`: script legacy mutate/xóa dữ liệu và token, không cô lập. Không chạy migrate/fresh trên DB mặc định. Theo dõi log Laravel, `failed_jobs`, queue, Reverb, mail và Gemini. Xem [BACKEND_TESTING_GUIDE.md](BACKEND_TESTING_GUIDE.md) và [API_CHECKLIST.md](API_CHECKLIST.md).

Xem [FR Implementation Audit](docs/FR_IMPLEMENTATION_AUDIT.md) để đối chiếu từng mã FR/NFR và mức sẵn sàng website/đồ án.
