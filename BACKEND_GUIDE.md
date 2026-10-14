# CẨM NANG HƯỚNG DẪN DÀNH CHO BACKEND DEVELOPER
> **Dự án:** Sàn Tìm Kiếm Việc Làm Online (TimViecOnline)  
> **Backend Framework:** Laravel 11 (PHP >= 8.2) | **Database:** MySQL (XAMPP / phpMyAdmin)  
> **Authentication:** Laravel Sanctum | **Realtime:** Laravel Reverb (WebSocket) | **AI:** Google Gemini 1.5 Flash  
> **Tài liệu đối chiếu:** [README.md](./README.md) | [SETUP_GUIDE.md](./SETUP_GUIDE.md) | [docs/SRS.md](./docs/SRS.md) | [db/tim_viec_online.sql](./db/tim_viec_online.sql)

---

## MỤC LỤC
1. [Bản đồ thư mục Backend & Vị trí làm việc](#1-bản-đồ-thư-mục-backend--vị-trí-làm-việc)
2. [Lệnh khởi chạy nhanh & Cấu hình môi trường](#2-lệnh-khởi-chạy-nhanh--cấu-hình-môi-trường)
3. [Lộ trình từng bước (Step-by-Step Roadmap)](#3-lộ-trình-từng-bước-step-by-step-roadmap)
4. [Thiết kế Cơ sở dữ liệu & Danh sách Migrations](#4-thiết-kế-cơ-sở-dữ-liệu--danh-sách-migrations)
5. [Quy chuẩn API & Bảng mã lỗi chuẩn SRS](#5-quy-chuẩn-api--bảng-mã-lỗi-chuẩn-srs)
6. [Danh sách API Endpoints chi tiết](#6-danh-sách-api-endpoints-chi-tiết)
7. [Hướng dẫn kỹ thuật đặc thù (AI Gemini & Realtime Reverb)](#7-hướng-dẫn-kỹ-thuật-đặc-thù-ai-gemini--realtime-reverb)
8. [Quy tắc Git & Phối hợp nhóm](#8-quy-tắc-git--phối-hợp-nhóm)

---

## 1. Bản đồ thư mục Backend & Vị trí làm việc

Toàn bộ mã nguồn bạn phụ trách nằm trong thư mục `/backend`. Dưới đây là các vị trí bạn sẽ code hàng ngày:

```text
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/         # Nơi viết toàn bộ API Controllers
│   │   │   ├── AuthController.php
│   │   │   ├── CandidateProfileController.php
│   │   │   ├── CompanyController.php
│   │   │   ├── JobController.php
│   │   │   ├── ApplicationController.php
│   │   │   ├── ChatController.php
│   │   │   └── AdminController.php
│   │   ├── Requests/            # Nơi validate dữ liệu theo chuẩn SRS (FormRequest)
│   │   └── Middleware/          # Check role: admin, employer, candidate, check locked user
│   ├── Models/                  # Eloquent Models & thiết lập Relationships
│   ├── Services/                # Lõi nghiệp vụ riêng: GeminiService.php
│   └── Events/                  # Sự kiện Realtime: MessageSent.php
├── database/
│   ├── migrations/              # Định nghĩa schema bảng trong DB
│   └── seeders/                 # Dữ liệu mẫu (Category, Skill, Admin, Fake Jobs)
├── routes/
│   ├── api.php                  # Đăng ký toàn bộ API endpoints
│   └── channels.php             # Phân quyền kênh WebSocket chat riêng tư
├── storage/app/public/          # Nơi chứa file upload (Avatar, Logo, CV PDF)
└── .env                         # Cấu hình DB, App Key, Gemini Key, Reverb
```

---

## 2. Lệnh khởi chạy nhanh & Cấu hình môi trường

### 2.1. Kiểm tra cấu hình file `backend/.env`
Đảm bảo file `.env` đã được cấu hình đúng:
```ini
APP_NAME=TimViecOnline
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Kết nối MySQL (Bật XAMPP MySQL trước)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tim_viec_online
DB_USERNAME=root
DB_PASSWORD=
DB_COLLATION=utf8mb4_unicode_ci

# Upload file (Ảnh đại diện, Logo, CV PDF)
FILESYSTEM_DISK=public

# WebSocket Laravel Reverb
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=timviec_app
REVERB_APP_KEY=timviec_key
REVERB_APP_SECRET=timviec_secret
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http

# Google Gemini AI Key
GEMINI_API_KEY=dien_api_key_cua_ban_vao_day
```

### 2.2. Các lệnh CLI thường dùng
```bash
# Di chuyển vào thư mục backend
cd backend

# Tạo symbolic link để truy cập file upload qua URL (Chỉ chạy 1 lần)
php artisan storage:link

# Chạy migration và seed dữ liệu
php artisan migrate
php artisan db:seed

# Khởi chạy server Backend API (Port 8000)
php artisan serve --port=8000

# Khởi chạy WebSocket Reverb (Mở 1 terminal riêng)
php artisan reverb:start
```

---

## 3. Lộ trình từng bước (Step-by-Step Roadmap)

### Giai đoạn 1: Database & Seeders (Ưu tiên số 1)
- [ ] Mở phpMyAdmin tạo database `tim_viec_online` (collation `utf8mb4_unicode_ci`).
- [ ] Tạo các file migration tương ứng 15 bảng theo file mẫu `db/tim_viec_online.sql`.
- [ ] Chạy `php artisan migrate`.
- [ ] Tạo các Models trong `app/Models/` và thiết lập các quan hệ (`hasOne`, `belongsTo`, `hasMany`, `belongsToMany`).
- [ ] Viết Seeders mẫu cho danh mục ngành nghề (`categories`) và kỹ năng (`skills`).

### Giai đoạn 2: Xác thực & Hồ sơ (Sanctum Auth & Profile)
- [ ] Tạo `AuthController`:
  - `POST /api/register`: Phân biệt Role `candidate` / `employer`. Tự động tạo bản ghi hồ sơ rỗng (`candidate_profiles` hoặc `companies`).
  - `POST /api/login`: Đăng nhập bằng Bcrypt, trả token Sanctum. Kiểm tra tài khoản bị khóa (`locked`), đếm 5 lần sai mật khẩu để tạm khóa.
  - `POST /api/logout`: Xóa access token hiện tại.
  - `GET /api/user`: Lấy thông tin người dùng đang đăng nhập kèm profile.
  - Quên mật khẩu & Đổi mật khẩu.
- [ ] Tạo `CandidateProfileController`: Cập nhật thông tin, chọn tối đa 10 kỹ năng, Upload CV PDF (max 5MB), trả URL xem trực tiếp.
- [ ] Tạo `CompanyController`: Cập nhật thông tin công ty, logo, website, quy mô.

### Giai đoạn 3: Việc làm (Job Core) & Tìm kiếm lọc
- [ ] Tạo `JobController`:
  - `GET /api/jobs`: Tìm kiếm theo từ khóa (tiêu đề, công ty, kỹ năng), lọc theo Category, City, Khoảng lương, Job Type. Sắp xếp `ORDER BY updated_at DESC`. Phân trang 10 jobs/trang.
  - `GET /api/jobs/{id}`: Xem chi tiết tin tuyển dụng.
  - `POST /api/employer/jobs`: Đăng tin mới (validate hạn nộp > hôm nay, lương min <= max).
  - `PUT /api/employer/jobs/{id}`: Chỉnh sửa tin.
  - `PATCH /api/employer/jobs/{id}/status`: Đóng hoặc mở lại tin (`active` / `closed`).
- [ ] Lưu việc làm: `POST /api/jobs/{id}/save` & `GET /api/candidate/saved-jobs`.

### Giai đoạn 4: Nộp hồ sơ (Applications) & Tích hợp AI Gemini
- [ ] Tạo `ApplicationController`:
  - `POST /api/jobs/{id}/apply`: Ứng viên nộp CV (chọn CV sẵn có hoặc upload mới), kiểm tra không nộp trùng lần 2 (`409 Conflict`).
  - Cơ chế bump tin tự động (FR-05.4): Khi nộp đơn thành công, gọi `$job->touch()` để cập nhật `updated_at = now()`, tự động đẩy tin lên đầu kết quả tìm kiếm.
  - `DELETE /api/candidate/applications/{id}/withdraw`: Rút hồ sơ (chỉ khi trạng thái còn `applied`).
  - `PATCH /api/employer/applications/{id}/status`: Nhà tuyển dụng đổi trạng thái hồ sơ (`waiting`, `accepted`, `rejected`).
- [ ] Tạo `app/Services/GeminiService.php`:
  - Đọc text từ CV PDF và nội dung JD.
  - Gửi prompt có cấu trúc sang Gemini 1.5 Flash.
  - Lưu kết quả chấm điểm vào bảng `ai_cv_analyses` (lưu vĩnh viễn, không tính toán lại).

### Giai đoạn 5: Realtime Chat (Reverb) & Thông báo
- [ ] Cấu hình Broadcast kênh riêng trong `routes/channels.php`: `private-chat.{conversationId}`.
- [ ] Tạo Event `MessageSent implements ShouldBroadcast`.
- [ ] Viết API Chat:
  - `GET /api/conversations`: Danh sách phòng chat của user.
  - `GET /api/conversations/{id}/messages`: Lịch sử tin nhắn.
  - `POST /api/conversations/{id}/messages`: Gửi tin nhắn và kích hoạt broadcast event.
- [ ] Hệ thống thông báo in-app (`/api/notifications`).

### Giai đoạn 6: Admin Dashboard & Nghiệm thu
- [ ] `GET /api/admin/stats`: Thống kê tổng số Ứng viên, NTD, Jobs, Đơn ứng tuyển.
- [ ] `GET /api/admin/users` & `PATCH /api/admin/users/{id}/status`: Khóa/Mở khóa tài khoản.
- [ ] Kiểm duyệt tin tuyển dụng bị báo cáo vi phạm.
- [ ] Xuất file `database/database_dump.sql` qua phpMyAdmin để nộp bài.

---

## 4. Thiết kế Cơ sở dữ liệu & Danh sách Migrations

Tham chiếu chi tiết tại file: [db/tim_viec_online.sql](./db/tim_viec_online.sql)

| STT | Tên bảng | Mục đích | Các cột chính |
|:---:|---|---|---|
| 1 | `users` | Tài khoản hệ thống | `id`, `name`, `email`, `password`, `phone`, `dob`, `role` (`candidate`,`employer`,`admin`), `status` (`active`,`locked`), `failed_attempts` |
| 2 | `candidate_profiles` | Hồ sơ ứng viên | `id`, `user_id`, `title`, `experience_years`, `bio`, `avatar`, `city`, `cv_file_path`, `social_links` |
| 3 | `companies` | Hồ sơ doanh nghiệp | `id`, `user_id`, `name`, `logo`, `website`, `company_size`, `address`, `city`, `description` |
| 4 | `categories` | Ngành nghề | `id`, `name`, `slug`, `icon` |
| 5 | `skills` | Kỹ năng | `id`, `name` |
| 6 | `candidate_skills` | Kỹ năng của ứng viên (N-N) | `candidate_profile_id`, `skill_id` (Tối đa 10 kỹ năng theo FR-03.2) |
| 7 | `jobs` *(hoặc recruitment_jobs)* | Tin tuyển dụng | `id`, `company_id`, `category_id`, `title`, `description`, `requirements`, `benefits`, `salary_type`, `salary_min`, `salary_max`, `job_type`, `city`, `deadline`, `status` (`active`,`closed`) |
| 8 | `job_skills` | Kỹ năng yêu cầu của việc (N-N) | `job_id`, `skill_id` |
| 9 | `applications` | Đơn nộp hồ sơ | `id`, `job_id`, `candidate_id`, `cv_path`, `cover_letter`, `status` (`applied`,`waiting`,`accepted`,`rejected`), `applied_at` |
| 10 | `saved_jobs` | Việc làm đã lưu | `id`, `candidate_id`, `job_id` |
| 11 | `ai_cv_analyses` | Kết quả AI phân tích CV | `id`, `application_id`, `match_score` (0-100), `strengths`, `missing_skills`, `suggestions` |
| 12 | `conversations` | Phòng chat 1-1 | `id`, `job_id`, `candidate_id`, `employer_id` |
| 13 | `messages` | Tin nhắn chat | `id`, `conversation_id`, `sender_id`, `message`, `is_read` |
| 14 | `notifications` | Thông báo in-app | `id`, `user_id`, `type`, `title`, `message`, `data`, `is_read` |
| 15 | `password_reset_tokens` | Token quên mật khẩu | `email`, `token`, `created_at` |

> [!NOTE]
> Laravel mặc định có bảng `jobs` phục vụ queue jobs. Để tránh xung đột, trong `config/queue.php` đã cấu hình `table => 'queue_jobs'`. Vì vậy bạn hoàn toàn có thể tạo bảng tuyển dụng tên là `jobs`.

---

## 5. Quy chuẩn API & Bảng mã lỗi chuẩn SRS

### 5.1. Cấu trúc Response JSON chuẩn (Thống nhất với Frontend)

#### Thành công (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "message": "Cập nhật hồ sơ thành công",
  "data": {
    "id": 1,
    "title": "Backend Developer"
  }
}
```

#### Thất bại / Lỗi validation (`400`, `401`, `403`, `404`, `422`):
```json
{
  "success": false,
  "message": "Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB",
  "errors": {
    "cv_file": [
      "File tải lên phải có định dạng pdf"
    ]
  }
}
```

### 5.2. Bảng quy chuẩn mã lỗi theo SRS (Phụ lục B)

| HTTP Code | Trường hợp phát sinh | Message hiển thị chuẩn tiếng Việt |
|---|---|---|
| `400 Bad Request` | Chọn hạn nộp ở quá khứ / hôm nay | `"Hạn nộp hồ sơ phải sau ngày hôm nay"` |
| `400 Bad Request` | Upload file CV sai định dạng / quá 5MB | `"Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB"` |
| `400 Bad Request` | Lương tối thiểu > lương tối đa | `"Mức lương tối thiểu không được lớn hơn mức lương tối đa"` |
| `400 Bad Request` | Rút hồ sơ khi nhà tuyển dụng đã xem | `"Nhà tuyển dụng đã xem hồ sơ của bạn, không thể rút đơn"` |
| `400 Bad Request` | Token đặt lại mật khẩu hết hạn | `"Liên kết xác thực đã hết hạn hoặc không hợp lệ"` |
| `400 Bad Request` | Nhập sai mật khẩu cũ | `"Mật khẩu hiện tại không chính xác"` |
| `401 Unauthorized` | Chưa đăng nhập hoặc token hết hạn | `"Phiên làm việc đã hết hạn, vui lòng đăng nhập lại"` |
| `403 Forbidden` | Tài khoản bị Admin khóa | `"Tài khoản của bạn đã bị khóa bởi quản trị viên"` |
| `403 Forbidden` | Nhập sai mật khẩu quá 5 lần | `"Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng thử lại sau 15 phút"` |
| `403 Forbidden` | Truy cập sai quyền (Candidate vào route Employer) | `"Bạn không có quyền truy cập vào chức năng này"` |
| `404 Not Found` | Xem tin không tồn tại / đã xóa | `"Công việc không tồn tại hoặc đã ngừng tuyển dụng"` |
| `409 Conflict` | Ứng viên nộp đơn lần thứ 2 cho cùng 1 job | `"Bạn đã nộp hồ sơ cho công việc này rồi"` |
| `422 Unprocessable`| Email đã được đăng ký trước đó | `"Email đã được sử dụng"` |
| `422 Unprocessable`| Nộp đơn vào tin đã đóng / hết hạn | `"Tin tuyển dụng này đã đóng hoặc đã hết hạn nộp hồ sơ"` |

---

## 6. Danh sách API Endpoints chi tiết

### 6.1. Xác thực & Tài khoản (`routes/api.php`)
- `POST /api/register`: Đăng ký tài khoản (name, email, password, password_confirmation, phone, role)
- `POST /api/login`: Đăng nhập -> trả Sanctum token + user info + role
- `POST /api/logout`: [Auth] Đăng xuất và thu hồi token
- `GET  /api/user`: [Auth] Lấy thông tin user hiện tại kèm profile
- `POST /api/forgot-password`: Yêu cầu gửi mail đặt lại mật khẩu
- `POST /api/reset-password`: Đặt lại mật khẩu bằng token
- `PUT  /api/user/change-password`: [Auth] Đổi mật khẩu

### 6.2. Hồ sơ cá nhân & Doanh nghiệp
- `GET  /api/candidate/profile`: [Candidate] Xem hồ sơ cá nhân
- `POST /api/candidate/profile`: [Candidate] Cập nhật hồ sơ (form-data: title, bio, city, avatar, skills, cv_file)
- `GET  /api/employer/company`: [Employer] Xem thông tin công ty mình
- `POST /api/employer/company`: [Employer] Cập nhật thông tin công ty (logo, website, address, size, description)
- `GET  /api/companies`: [Public] Danh sách các công ty nổi bật
- `GET  /api/companies/{id}`: [Public] Chi tiết công ty & các việc làm đang mở

### 6.3. Việc làm & Danh mục
- `GET    /api/categories`: [Public] Danh sách ngành nghề
- `GET    /api/skills`: [Public] Danh sách kỹ năng
- `GET    /api/jobs`: [Public] Tìm kiếm & Lọc (`?keyword=&category_id=&city=&salary_type=&min_salary=&max_salary=&page=`)
- `GET    /api/jobs/{id}`: [Public] Chi tiết việc làm
- `POST   /api/employer/jobs`: [Employer] Đăng tin tuyển dụng mới
- `PUT    /api/employer/jobs/{id}`: [Employer] Chỉnh sửa tin
- `PATCH  /api/employer/jobs/{id}/status`: [Employer] Đóng hoặc mở lại tin (`active` / `closed`)
- `GET    /api/employer/my-jobs`: [Employer] Danh sách các tin công ty đã đăng
- `POST   /api/jobs/{id}/save`: [Candidate] Lưu việc làm
- `DELETE /api/jobs/{id}/save`: [Candidate] Bỏ lưu
- `GET    /api/candidate/saved-jobs`: [Candidate] Danh sách việc đã lưu

### 6.4. Nộp đơn ứng tuyển & AI Chấm điểm
- `POST   /api/jobs/{id}/apply`: [Candidate] Nộp hồ sơ (cv_source: `default` hoặc `new`, cv_file: PDF, cover_letter)
- `DELETE /api/candidate/applications/{id}/withdraw`: [Candidate] Rút hồ sơ (khi trạng thái = `applied`)
- `GET    /api/candidate/applications`: [Candidate] Lịch sử nộp đơn
- `GET    /api/employer/jobs/{id}/applications`: [Employer] Danh sách ứng viên nộp vào job
- `GET    /api/employer/applications/{id}`: [Employer] Xem chi tiết đơn (tự đổi trạng thái sang `waiting`)
- `PATCH  /api/employer/applications/{id}/status`: [Employer] Đổi trạng thái (`accepted`, `rejected`)
- `POST   /api/applications/{id}/ai-analyze`: Phân tích CV qua Gemini API (lưu vào `ai_cv_analyses`)

### 6.5. Realtime Chat & Thông báo
- `GET   /api/conversations`: [Auth] Danh sách phòng trò chuyện của user
- `POST  /api/conversations`: [Auth] Mở cuộc trò chuyện mới giữa NTD và Ứng viên
- `GET   /api/conversations/{id}/messages`: [Auth] Lấy tin nhắn theo phòng (phân trang)
- `POST  /api/conversations/{id}/messages`: [Auth] Gửi tin nhắn -> Kích hoạt Broadcast Reverb
- `GET   /api/notifications`: [Auth] Danh sách thông báo in-app
- `PATCH /api/notifications/{id}/read`: [Auth] Đánh dấu 1 thông báo đã đọc
- `PATCH /api/notifications/read-all`: [Auth] Đánh dấu tất cả đã đọc

### 6.6. Admin
- `GET   /api/admin/stats`: [Admin] Thống kê Dashboard
- `GET   /api/admin/users`: [Admin] Danh sách người dùng
- `PATCH /api/admin/users/{id}/status`: [Admin] Khóa / Mở khóa tài khoản (`locked` / `active`)
- `GET   /api/admin/jobs`: [Admin] Danh sách tin tuyển dụng bị báo cáo
- `POST / PUT / DELETE /api/admin/categories`: [Admin] Quản lý danh mục
- `POST / PUT / DELETE /api/admin/skills`: [Admin] Quản lý kỹ năng

---

## 7. Hướng dẫn kỹ thuật đặc thù (AI Gemini & Realtime Reverb)

### 7.1. Cấu trúc Prompt trả về của GeminiService
Khi ứng viên nộp hồ sơ, gọi API Gemini 1.5 Flash yêu cầu output chuẩn JSON:
```json
{
  "match_score": 85,
  "summary": "Ứng viên có kỹ năng backend tốt, phù hợp cao với vị trí.",
  "matched_skills": ["PHP", "Laravel", "MySQL"],
  "missing_skills": ["Docker", "Redis"],
  "strengths": ["Đúng khung công nghệ", "2 năm kinh nghiệm thực chiến"],
  "recommendations": ["Cần bổ sung kiến thức về Redis Caching"]
}
```

### 7.2. Cấu hình Broadcast Realtime (Laravel Reverb)
Tạo Event `backend/app/Events/MessageSent.php`:
```php
namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class MessageSent implements ShouldBroadcast
{
    public $message;

    public function __construct(Message $message)
    {
        $this->message = $message->load('sender');
    }

    public function broadcastOn()
    {
        return new PrivateChannel('chat.' . $this->message->conversation_id);
    }

    public function broadcastAs()
    {
        return 'message.sent';
    }
}
```
Khai báo phân quyền trong `routes/channels.php`:
```php
Broadcast::channel('chat.{conversationId}', function ($user, $conversationId) {
    $conversation = \App\Models\Conversation::find($conversationId);
    return $conversation && ($user->id === $conversation->candidate_id || $user->id === $conversation->employer_id);
});
```

---

## 8. Quy tắc Git & Phối hợp nhóm

1. **Tuyệt đối không commit trực tiếp vào `main`**:
   - Nhánh chính phát triển là `develop`.
   - Mỗi tính năng tạo branch: `git switch -c feature/<tên-tính-năng>`.
2. **Quy ước đặt tên nhánh:**
   - `feature/database-migrations`
   - `feature/auth-sanctum`
   - `feature/job-crud`
   - `feature/ai-gemini-service`
   - `feature/reverb-chat`
3. **Trước khi tạo Pull Request về `develop`:**
   - Test kĩ API bằng Postman/Thunder Client.
   - Kiểm tra status code và thông báo lỗi đúng chuẩn Phụ lục B SRS.
   - Thường xuyên `git pull origin develop` để tránh conflict.
