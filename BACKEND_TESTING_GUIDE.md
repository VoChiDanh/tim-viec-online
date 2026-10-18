# CẨM NANG HƯỚNG DẪN KIỂM THỬ BACKEND TỪ A ĐẾN Z
> **Dự án:** Sàn Tìm Kiếm Việc Làm Online (TimViecOnline)  
> **Backend Framework:** Laravel 11 RESTful API | **Database:** MySQL (XAMPP / phpMyAdmin)  
> **WebSocket:** Laravel Reverb | **AI Engine:** Google Gemini 1.5 Flash  
> **Tài liệu đối chiếu:** [docs/SRS.md](file:///D:/xampp/htdocs/tim-viec-online/docs/SRS.md) | [BACKEND_GUIDE.md](file:///D:/xampp/htdocs/tim-viec-online/BACKEND_GUIDE.md) | [db/tim_viec_online.sql](file:///D:/xampp/htdocs/tim-viec-online/db/tim_viec_online.sql)

---

## MỤC LỤC
1. [Chuẩn bị môi trường & Khởi chạy hệ thống](#1-chuẩn-bị-môi-trường--khởi-chạy-hệ-thống)
2. [Danh sách tài khoản kiểm thử có sẵn (Seed Data)](#2-danh-sách-tài-khoản-kiểm-thử-có-sẵn-seed-data)
3. [Cách 1: Chạy bộ kiểm thử tự động 1 lệnh (Automated Test Suite - 58 Tests)](#3-cách-1-chạy-bộ-kiểm-thử-tự-động-1-lệnh-automated-test-suite)
4. [Cách 2: Hướng dẫn kiểm thử thủ công qua Postman / Thunder Client / cURL](#4-cách-2-hướng-dẫn-kiểm-thử-thủ-công-qua-postman--thunder-client--curl)
   * [4.1. Module Xác thực & Tài khoản (Auth & Sanctum)](#41-module-xác-thực--tài-khoản-auth--sanctum)
   * [4.2. Module Dữ liệu Danh mục (Categories & Skills)](#42-module-dữ-liệu-danh-mục-categories--skills)
   * [4.3. Module Hồ sơ Người dùng (Candidate & Company Profile)](#43-module-hồ-sơ-người-dùng-candidate--company-profile)
   * [4.4. Module Việc làm & Vòng đời tin tuyển dụng (Jobs Core)](#44-module-việc-làm--vòng-đời-tin-tuyển-dụng-jobs-core)
   * [4.5. Module Ứng tuyển & Tích hợp Gemini AI (Applications & AI Score)](#45-module-ứng-tuyển--tích-hợp-gemini-ai-applications--ai-score)
   * [4.6. Module Nhắn tin Realtime qua WebSocket Reverb (Chat Core)](#46-module-nhắn-tin-realtime-qua-websocket-reverb-chat-core)
   * [4.7. Module Hệ thống Thông báo trên Web (Web Notifications)](#47-module-hệ-thống-thông-báo-trên-web-web-notifications)
   * [4.8. Module Quản trị viên (Admin Dashboard & Moderation)](#48-module-quản-trị-viên-admin-dashboard--moderation)
5. [Bảng đối chiếu mã trạng thái HTTP & Thông báo lỗi chuẩn SRS](#5-bảng-đối-chiếu-mã-trạng-thái-http--thông-báo-lỗi-chuẩn-srs)
6. [Xử lý sự cố thường gặp (Troubleshooting)](#6-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Chuẩn bị môi trường & Khởi chạy hệ thống

### 1.1. Kiểm tra cấu hình file `backend/.env`
Mở file `backend/.env` và đảm bảo các thông số cấu hình chính xác:
```ini
APP_NAME=TimViecOnline
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Kết nối MySQL (Bật XAMPP MySQL)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tim-viec-online
DB_USERNAME=root
DB_PASSWORD=

# Lưu trữ file công khai (Avatar, Logo, CV PDF, Chat Images)
FILESYSTEM_DISK=public

# WebSocket Laravel Reverb (Realtime Chat & Notifications)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=timviec_app
REVERB_APP_KEY=timviec_key
REVERB_APP_SECRET=timviec_secret
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http

# Google Gemini AI Key (Nếu để trống, hệ thống kích hoạt Heuristic Fallback thông minh)
GEMINI_API_KEY=dien_api_key_cua_ban_vao_day
```

### 1.2. Tạo symbolic link cho thư mục lưu trữ file
Chạy lệnh này (chỉ cần chạy 1 lần) để cho phép trình duyệt truy cập các file upload tại `http://localhost:8000/storage/...`:
```bash
cd backend
php artisan storage:link
```

### 1.3. Khởi chạy máy chủ Backend API
Mở cửa sổ Terminal thứ nhất:
```bash
cd backend
php artisan serve --port=8000
```
> API Base URL: `http://localhost:8000/api`

### 1.4. Khởi chạy máy chủ WebSocket Reverb (Phục vụ Realtime Chat & Notifications)
Mở cửa sổ Terminal thứ hai:
```bash
cd backend
php artisan reverb:start
```

---

## 2. Danh sách tài khoản kiểm thử có sẵn (Seed Data)

Dữ liệu mẫu ban đầu trong CSDL đã có sẵn 3 tài khoản tương ứng với 3 vai trò (Role):

| Vai trò | Email đăng nhập | Mật khẩu mặc định | Hồ sơ liên kết sẵn |
|---|---|---|---|
| **Quản trị viên (Admin)** | `admin@timviec.vn` | `Password123@` | Quản trị viên hệ thống toàn quyền |
| **Nhà tuyển dụng (Employer)** | `employer@timviec.vn` | `Password123@` | Công ty: **FPT Software** |
| **Ứng viên (Candidate)** | `candidate@timviec.vn` | `Password123@` | Hồ sơ: **Lập Trình Viên Fullstack**, 5 kỹ năng |

---

## 3. Cách 1: Chạy bộ kiểm thử tự động 1 lệnh (Automated Test Suite)

Trong thư mục `backend/` đã tích hợp sẵn kịch bản kiểm thử tự động toàn diện `test_all_backend.php`.  
Kịch bản này tự động thực thi **58 bài test liên hoàn** từ Module 1 đến Module 8, bao quát 100% các yêu cầu chức năng (FR-01 đến FR-10) và mã lỗi chuẩn Phụ lục B SRS, sau đó tự động dọn dẹp sạch sẽ dữ liệu phát sinh.

### Lệnh thực thi:
```bash
cd backend
php test_all_backend.php
```

### Kết quả kỳ vọng trên Terminal:
```text
=======================================================
    BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG HỆ THỐNG BACKEND API
=======================================================

1. KIỂM THỬ MODULE XÁC THỰC (AUTH & SANCTUM):
  [PASS] 1.1 Đăng ký tài khoản Ứng viên (201 Created)
  [PASS] 1.2 Tự động tạo CandidateProfile rỗng (FR-01.6)
  [PASS] 1.3 Đăng ký trùng email trả lỗi 422 'Email đã được sử dụng'
  [PASS] 1.4 Đăng nhập sai mật khẩu trả 401 'Email hoặc mật khẩu không chính xác' (FR-02.2)
  [PASS] 1.5 Sai 5 lần liên tiếp trả 403 'Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản' (FR-02.4)
  [PASS] 1.6 Đăng nhập thành công trả 200 kèm Bearer Token & redirect_url=/jobs (FR-02.6)
  [PASS] 1.7 Gọi API Protected /api/user trả 200 kèm Profile
  [PASS] 1.8 Đổi mật khẩu sai mật khẩu hiện tại trả 400 'Mật khẩu hiện tại không chính xác' (FR-02.9)
  [PASS] 1.9 Đổi mật khẩu mới trùng mật khẩu cũ trả 400 'Mật khẩu mới không được trùng với mật khẩu hiện tại' (FR-02.9)
  [PASS] 1.10 Đổi mật khẩu thành công trả 200 'Đổi mật khẩu thành công' (FR-02.9)
  [PASS] 1.11 Quên mật khẩu email không tồn tại trả 404 (FR-02.7)
  [PASS] 1.12 Quên mật khẩu thành công trả 200 & tạo token xác thực (FR-02.7)
  [PASS] 1.13 Token đặt lại mật khẩu không hợp lệ trả 400 'Liên kết xác thực đã hết hạn hoặc không hợp lệ' (FR-02.8)
  [PASS] 1.14 Đặt lại mật khẩu thành công trả 200 'Đặt lại mật khẩu thành công' & redirect_url=/login (FR-02.8)

2. KIỂM THỬ MASTER DATA (NGÀNH NGHỀ & KỸ NĂNG):
  [PASS] 2.1 Lấy danh sách Ngành nghề công khai (/api/categories)
  [PASS] 2.2 Tìm kiếm kỹ năng autocomplete (/api/skills?keyword=PHP)

3. KIỂM THỬ HỒ SƠ CÁ NHÂN & TẢI LÊN CV PDF:
  [PASS] 3.1 Upload CV sai định dạng trả 400 'Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB'
  [PASS] 3.2 Upload CV PDF hợp lệ & cập nhật kỹ năng trả 200
  [PASS] 3.3 Nhà tuyển dụng cập nhật hồ sơ công ty (/api/employer/company)

4. KIỂM THỬ CORE VIỆC LÀM (FR-04 CRUD & VÒNG ĐỜI TIN TUYỂN DỤNG):
  [PASS] 4.1 Chưa cập nhật đủ hồ sơ công ty trả 400 (FR-04.1)
  [PASS] 4.2 Hạn nộp hồ sơ ở quá khứ trả 400 'Hạn nộp hồ sơ phải sau ngày hôm nay' (FR-04.3)
  [PASS] 4.3 Lương min > max trả 400 'Mức lương tối thiểu không được lớn hơn mức lương tối đa' (FR-04.4)
  [PASS] 4.4 Đăng tin tuyển dụng hợp lệ trả 201 Created & status='active' (FR-04.5)
  [PASS] 4.5 Định dạng mức lương: Lương khởi điểm 'Từ X triệu VNĐ' & Lương thỏa thuận 'Thỏa thuận' (FR-04.4)
  [PASS] 4.6 Xem trang công ty công khai trả 200 kèm danh sách tin đang mở (FR-04.7)
  [PASS] 4.7 Đóng tin tuyển dụng trả 200 & chặn ứng viên apply trả lỗi 422 (FR-04.6)
  [PASS] 4.8 Mở lại tin tuyển dụng thành công trả 200 'Đã mở lại tin tuyển dụng' (FR-04.6)
  [PASS] 4.9 Tìm kiếm từ khóa và lọc khoảng mức lương (/api/jobs)
  [PASS] 4.10 Ứng viên lưu việc làm yêu thích (/api/jobs/{id}/save)

5. KIỂM THỬ ỨNG TUYỂN & TÍCH HỢP GEMINI AI (FR-06):
  [PASS] 5.1 Phân quyền nộp đơn: Khách trả 401 & NTD trả 403 'Chỉ tài khoản Ứng viên mới có quyền nộp đơn ứng tuyển' (FR-06.1)
  [PASS] 5.2 Nộp CV mới nhưng không gửi kèm file PDF trả 400 'Vui lòng tải lên file CV PDF cho vị trí này' (FR-06.2)
  [PASS] 5.3 Nộp hồ sơ bằng CV profile thành công trả 201 Created & status='applied' (FR-06.2 & FR-06.5)
  [PASS] 5.4 Tích hợp AI Gemini phân tích Match Score (0-100%)
  [PASS] 5.5 Nút Ứng tuyển bị vô hiệu hóa & chặn nộp trùng lần 2 trả 409 'Bạn đã nộp hồ sơ cho công việc này rồi' (FR-06.4)
  [PASS] 5.6 NTD mở xem CV: tự động chuyển sang trạng thái 'waiting' (FR-06.5)
  [PASS] 5.7 Chặn rút hồ sơ khi NTD đã xem xét trả lỗi 400 Bad Request
  [PASS] 5.8 NTD cập nhật trạng thái hồ sơ sang 'accepted' (Trúng tuyển) trả 200 (FR-06.5)
  [PASS] 5.9 Ứng viên xem lịch sử ứng tuyển & lọc trạng thái theo thời gian thực trả 200 (FR-06.7)

6. KIỂM THỬ REALTIME CHAT & THÔNG BÁO IN-APP (FR-08):
  [PASS] 6.1 Chặn tạo phòng chat khi ứng viên chưa nộp đơn trả 400 (FR-08.1)
  [PASS] 6.2 Khởi tạo phòng chat thành công giữa NTD & Ứng viên đã nộp đơn (FR-08.1)
  [PASS] 6.3 Chặn gửi tin nhắn rỗng toàn dấu cách/enter trả 400 (FR-08.2)
  [PASS] 6.4 Chặn gửi tin nhắn vượt quá 1.000 ký tự trả 400 (FR-08.2)
  [PASS] 6.5 Gửi tin nhắn văn bản thành công kích hoạt Broadcast Event (201 Created) (FR-08.2 & FR-08.3)
  [PASS] 6.6 Hỗ trợ gửi tin nhắn đính kèm hình ảnh trả 201 kèm image_url (FR-08.2)
  [PASS] 6.7 Mở xem tin nhắn: tự động cập nhật trạng thái 'Đã xem' & thời gian HH:mm (FR-08.4)
  [PASS] 6.8 Cơ chế bảo mật: Người ngoài không thể xem hoặc gửi tin vào phòng chat trả 403 (FR-08.5)
  [PASS] 6.9 Duy trì liên lạc khi tin đóng trả 201 & kèm nhãn 'Tin tuyển dụng đã đóng' (FR-08.6)

7. KIỂM THỬ HỆ THỐNG THÔNG BÁO TRÊN WEB (FR-10):
  [PASS] 7.1 Tự động gửi thông báo cho Ứng viên khi NTD đổi trạng thái hồ sơ Trúng tuyển/Từ chối (FR-10.1)
  [PASS] 7.2 Tự động gửi thông báo cho Ứng viên khi NTD gửi tin nhắn mới trong phòng chat (FR-10.1)
  [PASS] 7.3 Tự động gửi thông báo cho Nhà tuyển dụng khi có ứng viên mới nộp hồ sơ (FR-10.2)
  [PASS] 7.4 Tự động gửi thông báo cho Nhà tuyển dụng khi Ứng viên gửi tin nhắn mới (FR-10.2)
  [PASS] 7.5 Trải nghiệm thông báo: Unread badge, thời gian tương đối & màu nền background (FR-10.3)
  [PASS] 7.6 Đánh dấu đã đọc từng thông báo trả 200 & cập nhật is_read=true (FR-10.3)
  [PASS] 7.7 Đánh dấu tất cả là đã đọc trả 200 & unread_count=0 (FR-10.3)
  [PASS] 7.8 Lọc thông báo theo trạng thái ?status=unread và ?status=read (FR-10.3)

8. KIỂM THỬ QUẢN TRỊ ADMIN (STATS & KHÓA USER):
  [PASS] 8.1 Lấy số liệu thống kê Dashboard (/api/admin/stats)
  [PASS] 8.2 Khóa tài khoản người dùng & thu hồi token (/api/admin/users/{id}/status)
  [PASS] 8.3 Đăng nhập tài khoản bị khóa trả 403 'Tài khoản của bạn đã bị khóa bởi quản trị viên'

=======================================================
    KẾT QUẢ KIỂM THỬ: 58 PASSED | 0 FAILED
    >>> TẤT CẢ 58 BÀI TEST HOẠT ĐỘNG HOÀN HẢO 100%! <<<
=======================================================
```

---

## 4. Cách 2: Hướng dẫn kiểm thử thủ công qua Postman / Thunder Client / cURL

### Cấu hình Header chung cho các Request:
* `Accept: application/json`
* `Content-Type: application/json` (với các request JSON)
* Với các request có xác thực (Protected):  
  `Authorization: Bearer <TOKEN_NHẬN_ĐƯỢC_SAU_KHI_LOGIN>`

---

### 4.1. Module Xác thực & Tài khoản (Auth & Sanctum)

#### Test Case 1: Đăng ký tài khoản Ứng viên mới (FR-01)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/register`
* **Body (raw JSON):**
  ```json
  {
    "name": "Trần Văn An",
    "email": "an.tran@example.com",
    "password": "Password123@",
    "password_confirmation": "Password123@",
    "phone": "0988776655",
    "dob": "2001-05-15",
    "role": "candidate"
  }
  ```
* **Kỳ vọng:** `201 Created`, tự động cấp Bearer token và tạo sẵn bản ghi `candidate_profile` rỗng.

#### Test Case 2: Đăng ký trùng email (FR-01.3)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/register`
* **Body:** Nhập lại email `an.tran@example.com` đã tạo.
* **Kỳ vọng:** `422 Unprocessable Content`:
  ```json
  {
    "success": false,
    "message": "Email đã được sử dụng",
    "errors": { "email": ["Email đã được sử dụng"] }
  }
  ```

#### Test Case 3: Đăng nhập sai mật khẩu (FR-02.2)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/login`
* **Body:**
  ```json
  {
    "email": "candidate@timviec.vn",
    "password": "WrongPassword!"
  }
  ```
* **Kỳ vọng:** `401 Unauthorized`:
  ```json
  {
    "success": false,
    "message": "Email hoặc mật khẩu không chính xác"
  }
  ```

#### Test Case 4: Nhập sai mật khẩu liên tiếp 5 lần bị tạm khóa (FR-02.3 & FR-02.4)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/login`
* **Body:** Lặp lại gửi sai mật khẩu đến lần thứ 5 liên tiếp.
* **Kỳ vọng:** `403 Forbidden`:
  ```json
  {
    "success": false,
    "message": "Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản"
  }
  ```

#### Test Case 5: Đăng nhập thành công & Điều hướng tự động (FR-02.6)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/login`
* **Body:**
  ```json
  {
    "email": "candidate@timviec.vn",
    "password": "Password123@"
  }
  ```
* **Kỳ vọng:** `200 OK`, trả về token, thông tin user và `redirect_url: "/jobs"`.  
  *(Lưu token vào biến môi trường Postman `{{candidate_token}}`)*.

#### Test Case 6: Lấy thông tin tài khoản hiện tại kèm Profile
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/user`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK`, trả về `user` kèm `candidate_profile` và mảng `skills`.

#### Test Case 7: Đổi mật khẩu - Sai mật khẩu hiện tại (FR-02.9)
* **Method:** `PUT`
* **URL:** `http://localhost:8000/api/user/change-password`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body:**
  ```json
  {
    "current_password": "WrongPass123@",
    "new_password": "NewPassword123@",
    "new_password_confirmation": "NewPassword123@"
  }
  ```
* **Kỳ vọng:** `400 Bad Request: "Mật khẩu hiện tại không chính xác"`.

#### Test Case 8: Đổi mật khẩu - Mật khẩu mới trùng mật khẩu cũ (FR-02.9)
* **Method:** `PUT`
* **URL:** `http://localhost:8000/api/user/change-password`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body:**
  ```json
  {
    "current_password": "Password123@",
    "new_password": "Password123@",
    "new_password_confirmation": "Password123@"
  }
  ```
* **Kỳ vọng:** `400 Bad Request: "Mật khẩu mới không được trùng với mật khẩu hiện tại"`.

#### Test Case 9: Đổi mật khẩu thành công (FR-02.9)
* **Method:** `PUT`
* **URL:** `http://localhost:8000/api/user/change-password`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body:**
  ```json
  {
    "current_password": "Password123@",
    "new_password": "Password123@#",
    "new_password_confirmation": "Password123@#"
  }
  ```
* **Kỳ vọng:** `200 OK: "Đổi mật khẩu thành công"` và tạo thông báo bảo mật in-app.

#### Test Case 10: Quên mật khẩu - Email không tồn tại (FR-02.7)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/forgot-password`
* **Body:** `{ "email": "nonexistent@gmail.com" }`
* **Kỳ vọng:** `404 Not Found: "Email không tồn tại trong hệ thống"`.

#### Test Case 11: Quên mật khẩu thành công & Gửi mail (FR-02.7)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/forgot-password`
* **Body:** `{ "email": "candidate@timviec.vn" }`
* **Kỳ vọng:** `200 OK: "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn"`, trả về token có hạn 15 phút.

#### Test Case 12: Kiểm tra liên kết đặt lại mật khẩu (FR-02.8)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/verify-reset-token?email=candidate@timviec.vn&token=<TOKEN_O_TC11>`
* **Kỳ vọng:** `200 OK: "Liên kết xác thực hợp lệ"`. Nếu token sai/hết hạn (>15p): `400 Bad Request: "Liên kết xác thực đã hết hạn hoặc không hợp lệ"`.

#### Test Case 13: Đặt lại mật khẩu mới bằng token (FR-02.8)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/reset-password`
* **Body:**
  ```json
  {
    "email": "candidate@timviec.vn",
    "token": "<TOKEN_O_TC11>",
    "password": "Password123@",
    "password_confirmation": "Password123@"
  }
  ```
* **Kỳ vọng:** `200 OK: "Đặt lại mật khẩu thành công"`, `redirect_url: "/login"`, đồng thời mở khóa tài khoản và reset số lần sai.

---

### 4.2. Module Dữ liệu Danh mục (Categories & Skills)

#### Test Case 14: Lấy danh sách ngành nghề công khai
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/categories`
* **Kỳ vọng:** `200 OK`, trả về mảng danh mục kèm trường `jobs_count`.

#### Test Case 15: Tìm kiếm kỹ năng autocomplete
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/skills?keyword=PHP`
* **Kỳ vọng:** `200 OK`, trả về danh sách kỹ năng chứa từ khóa PHP.

#### Test Case 16: Thêm ngành nghề mới (Admin only)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/admin/categories`
* **Headers:** `Authorization: Bearer {{admin_token}}`
* **Body:** `{ "name": "Trí tuệ nhân tạo & Data Science", "slug": "ai-data-science" }`
* **Kỳ vọng:** `201 Created`. (Nếu gọi bằng `{{candidate_token}}` sẽ bị từ chối `403 Forbidden`).

---

### 4.3. Module Hồ sơ Người dùng (Candidate & Company Profile)

#### Test Case 17: Xem hồ sơ Ứng viên
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/candidate/profile`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK`, hiển thị `title`, `experience_years`, `cv_url`, `skills`.

#### Test Case 18: Tải lên CV sai định dạng không phải PDF (FR-03.4)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/candidate/profile`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body (form-data):** key `cv_file` chọn 1 file `.docx` hoặc `.png`.
* **Kỳ vọng:** `400 Bad Request: "Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB"`.

#### Test Case 19: Cập nhật hồ sơ & Tải lên file CV PDF chuẩn (FR-03.3 - FR-03.5)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/candidate/profile`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body (form-data):**
  * `title`: `Senior Backend PHP/Laravel`
  * `experience_years`: `3`
  * `city`: `Hà Nội`
  * `skills[0]`: `1`
  * `skills[1]`: `2`
  * `cv_file`: Chọn file định dạng `.pdf` (dung lượng < 5MB).
* **Kỳ vọng:** `200 OK`, file được lưu vào `storage/app/public/cvs/` và trả về `cv_url` mở trực tiếp trên trình duyệt.

#### Test Case 20: Nhà tuyển dụng cập nhật hồ sơ công ty (FR-04.1)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/employer/company`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (form-data):**
  * `name`: `FPT Software`
  * `address`: `Khu Công Nghệ Cao Hòa Lạc`
  * `city`: `Hà Nội`
  * `website`: `https://fptsoftware.com`
  * `company_size`: `1000+ nhân viên`
  * `description`: `Tập đoàn chuyển đổi số toàn cầu.`
* **Kỳ vọng:** `200 OK: "Cập nhật thông tin công ty thành công"`.

---

### 4.4. Module Việc làm & Vòng đời tin tuyển dụng (Jobs Core)

#### Test Case 21: Chặn đăng tin khi chưa cập nhật đầy đủ thông tin công ty (FR-04.1)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/employer/jobs`
* **Headers:** `Authorization: Bearer {{employer_token}}` (với tài khoản NTD chưa cập nhật mô tả/trụ sở/tỉnh thành).
* **Kỳ vọng:** `400 Bad Request: "Vui lòng cập nhật đầy đủ thông tin công ty (Tên, Giới thiệu, Trụ sở, Tỉnh/Thành phố) trước khi đăng tin tuyển dụng đầu tiên"`.

#### Test Case 22: Đăng tin có hạn nộp ở quá khứ hoặc hôm nay (FR-04.3)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/employer/jobs`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (JSON):**
  ```json
  {
    "title": "Tuyển Lập Trình Viên Backend",
    "category_id": 1,
    "job_level": "Middle",
    "quantity": 1,
    "job_type": "full_time",
    "city": "Hà Nội",
    "deadline": "2020-01-01",
    "description": "Mô tả",
    "requirements": "Yêu cầu",
    "skills": [1, 2]
  }
  ```
* **Kỳ vọng:** `400 Bad Request: "Hạn nộp hồ sơ phải sau ngày hôm nay"`.

#### Test Case 23: Đăng tin có lương min > max (FR-04.4)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/employer/jobs`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (JSON):** Truyền `salary_min: 30000000`, `salary_max: 20000000`.
* **Kỳ vọng:** `400 Bad Request: "Mức lương tối thiểu không được lớn hơn mức lương tối đa"`.

#### Test Case 24: Đăng tin tuyển dụng hợp lệ (Khoảng lương cụ thể - FR-04.5)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/employer/jobs`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (JSON):**
  ```json
  {
    "title": "Lập Trình Viên Fullstack Laravel & NextJS",
    "category_id": 1,
    "job_level": "Junior",
    "quantity": 2,
    "job_type": "full_time",
    "city": "Hà Nội",
    "address": "Tòa nhà FPT, Cầu Giấy, Hà Nội",
    "deadline": "2026-12-31",
    "salary_min": 15000000,
    "salary_max": 25000000,
    "description": "Mô tả chi tiết công việc dự án.",
    "requirements": "Thành thạo Laravel, Next.js, MySQL.",
    "benefits": "Lương tháng 13, bảo hiểm đầy đủ.",
    "skills": [1, 2, 6]
  }
  ```
* **Kỳ vọng:** `201 Created`, `status = "active"`, hiển thị `salary_display: "15 - 25 triệu VNĐ"`. Lưu `id` tin tạo (ví dụ: `{{job_id}}`).

#### Test Case 25: Đăng tin Lương khởi điểm và Lương thỏa thuận (FR-04.4)
* **Lương khởi điểm:** Truyền `salary_type: "from"`, `salary_min: 18000000`.  
  -> Kỳ vọng: Trả về `salary_display: "Từ 18 triệu VNĐ"`.
* **Lương thỏa thuận:** Truyền `salary_type: "negotiable"` hoặc `is_negotiable: true`.  
  -> Kỳ vọng: Trả về `salary_display: "Thỏa thuận"`.

#### Test Case 26: Xem trang công ty công khai kèm tin tuyển dụng (FR-04.7)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/companies/1`
* **Kỳ vọng:** `200 OK`, trả về thông tin công ty và mảng `jobs` chứa các tin tuyển dụng đang mở (`status = 'active'`).

#### Test Case 27: Đóng tin tuyển dụng & Chặn nộp hồ sơ mới (FR-04.6)
* **Bước 1 (Đóng tin):** `PATCH /api/employer/jobs/{{job_id}}/status` với body `{ "status": "closed" }`.  
  -> Kỳ vọng: `200 OK: "Đã đóng tin tuyển dụng"`.
* **Bước 2 (Chặn nộp hồ sơ):** Gọi `POST /api/jobs/{{job_id}}/apply` bằng `{{candidate_token}}`.  
  -> Kỳ vọng: `422 Unprocessable Content: "Tin tuyển dụng này đã đóng hoặc đã hết hạn nộp hồ sơ"`.

#### Test Case 28: Mở lại tin tuyển dụng (FR-04.6)
* **Method:** `PATCH`
* **URL:** `http://localhost:8000/api/employer/jobs/{{job_id}}/status`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body:** `{ "status": "active" }`
* **Kỳ vọng:** `200 OK: "Đã mở lại tin tuyển dụng"`.

#### Test Case 29: Tìm kiếm từ khóa & Lọc đa tiêu chí (FR-05)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/jobs?keyword=Laravel&category_id=1&city=Hà Nội&salary_range=10_20`
* **Kỳ vọng:** `200 OK`, lọc ra đúng các tin thỏa mãn và sắp xếp theo `updated_at DESC`.

#### Test Case 30: Lưu và Bỏ lưu việc làm yêu thích (FR-05.6)
* Lưu việc làm: `POST /api/jobs/{{job_id}}/save` -> `200 OK: "Lưu việc làm thành công"`.
* Xem danh sách: `GET /api/candidate/saved-jobs` -> `200 OK`.
* Bỏ lưu: `DELETE /api/jobs/{{job_id}}/save` -> `200 OK: "Bỏ lưu việc làm thành công"`.

---

### 4.5. Module Ứng tuyển & Tích hợp Gemini AI (Applications & AI Score)

#### Test Case 31: Phân quyền nộp đơn (FR-06.1)
* Không truyền Bearer token -> `401 Unauthorized`.
* Truyền token của Nhà tuyển dụng (`{{employer_token}}`) -> `403 Forbidden: "Chỉ tài khoản Ứng viên mới có quyền nộp đơn ứng tuyển"`.

#### Test Case 32: Chọn nộp CV mới nhưng không gửi file PDF (FR-06.2)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/jobs/{{job_id}}/apply`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body (form-data):** `cv_source: "new"` (không gửi file).
* **Kỳ vọng:** `400 Bad Request: "Vui lòng tải lên file CV PDF cho vị trí này"`.

#### Test Case 33: Nộp hồ sơ bằng CV hồ sơ cá nhân & AI chấm điểm (FR-06.2 & FR-07)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/jobs/{{job_id}}/apply`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Body (form-data):**
  * `cv_source`: `profile`
  * `cover_letter`: `Tôi rất mong muốn được cống hiến cho công ty.`
* **Kỳ vọng:**
  * `201 Created`, trạng thái khởi tạo `status = "applied"`.
  * Trả về kết quả AI: `match_score` (0-100), `strengths`, `missing_skills`, `summary`.
  * Tự động bump tin (`updated_at` của Job nhảy lên thời điểm hiện tại theo FR-05.4).
  * Tự động gửi thông báo in-app cho Nhà tuyển dụng theo FR-10.2. Lưu `{{application_id}}`.

#### Test Case 34: Kiểm tra trạng thái nút & Chặn nộp trùng lần 2 (FR-06.4)
* **Bước 1:** `GET /api/jobs/{{job_id}}` bằng `{{candidate_token}}`.  
  -> Kỳ vọng: `is_applied: true`, `apply_button_disabled: true`, `apply_button_message: "Bạn đã nộp hồ sơ cho công việc này rồi"`.
* **Bước 2:** Cố tình gửi lại request `POST /api/jobs/{{job_id}}/apply`.  
  -> Kỳ vọng: `409 Conflict: "Bạn đã nộp hồ sơ cho công việc này rồi"`.

#### Test Case 35: NTD xem CV & Tự động đổi trạng thái sang 'waiting' (FR-06.5)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/employer/applications/{{application_id}}`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Kỳ vọng:** `200 OK`, `status` tự động chuyển từ `applied` sang `waiting`, có ghi nhận thời gian `reviewed_at`.

#### Test Case 36: Chặn rút đơn khi NTD đã xem xét (FR-06.5)
* **Method:** `DELETE`
* **URL:** `http://localhost:8000/api/candidate/applications/{{application_id}}/withdraw`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `400 Bad Request: "Nhà tuyển dụng đã xem hồ sơ của bạn, không thể rút đơn"`.

#### Test Case 37: NTD cập nhật kết quả hồ sơ sang 'accepted' (Trúng tuyển - FR-06.5)
* **Method:** `PATCH`
* **URL:** `http://localhost:8000/api/employer/applications/{{application_id}}/status`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body:** `{ "status": "accepted" }`
* **Kỳ vọng:** `200 OK`, `status` chuyển thành `accepted`, tự động gửi thông báo in-app cho Ứng viên.

#### Test Case 38: Ứng viên theo dõi lịch sử ứng tuyển & Lọc thời gian thực (FR-06.7)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/candidate/applications?status=accepted`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK`, lọc ra đơn đã trúng tuyển kèm thông tin công ty và điểm AI.

---

### 4.6. Module Nhắn tin Realtime qua WebSocket Reverb (Chat Core)

#### Test Case 39: Chặn tạo phòng chat khi ứng viên chưa nộp đơn (FR-08.1)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/conversations`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body:** `{ "job_id": 999, "partner_id": 3 }` (Job mà ứng viên 3 chưa từng nộp đơn).
* **Kỳ vọng:** `400 Bad Request: "Phòng trò chuyện chỉ được tạo khi ứng viên đã nộp hồ sơ vào tin tuyển dụng này"`.

#### Test Case 40: Khởi tạo phòng chat thành công giữa NTD & Ứng viên (FR-08.1)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/conversations`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body:** `{ "job_id": {{job_id}}, "partner_id": 3 }` (Ứng viên đã nộp đơn ở Test Case 33).
* **Kỳ vọng:** `200 OK`, trả về `id` phòng chat (ví dụ: `{{conversation_id}}`).

#### Test Case 41: Chặn gửi tin nhắn rỗng hoặc chỉ chứa khoảng trắng/enter (FR-08.2)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/conversations/{{conversation_id}}/messages`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body:** `{ "message": "   \n\t   " }`
* **Kỳ vọng:** `400 Bad Request: "Nội dung tin nhắn không được để trống hoặc chỉ chứa khoảng trắng"`.

#### Test Case 42: Chặn gửi tin nhắn vượt quá 1.000 ký tự (FR-08.2)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/conversations/{{conversation_id}}/messages`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body:** `{ "message": "<1001 KÝ TỰ>" }`
* **Kỳ vọng:** `400 Bad Request: "Nội dung tin nhắn không được vượt quá 1.000 ký tự"`.

#### Test Case 43: Gửi tin nhắn văn bản hợp lệ & Phát Broadcast Reverb (FR-08.2 & FR-08.3)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/conversations/{{conversation_id}}/messages`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body:** `{ "message": "Chào bạn, chúng tôi muốn mời bạn phỏng vấn trực tiếp vào 9h sáng thứ Hai." }`
* **Kỳ vọng:**
  * `201 Created`, trả về `status_display: "Đã gửi"`, `time_display: "HH:mm"`.
  * Sự kiện `MessageSent` được phát lên WebSocket Reverb kênh `chat.{{conversation_id}}` (< 1s).
  * Tự động tạo thông báo in-app cho Ứng viên.

#### Test Case 44: Gửi tin nhắn đính kèm hình ảnh (FR-08.2)
* **Method:** `POST`
* **URL:** `http://localhost:8000/api/conversations/{{conversation_id}}/messages`
* **Headers:** `Authorization: Bearer {{employer_token}}`
* **Body (form-data):**
  * `message`: `Sơ đồ đường đi đến văn phòng công ty`
  * `image`: Chọn file ảnh (`.png` hoặc `.jpg` dung lượng <= 5MB).
* **Kỳ vọng:** `201 Created`, trả về `image_url` lưu trong `storage/app/public/chat_images/`.

#### Test Case 45: Mở xem tin nhắn: Tự động cập nhật 'Đã xem' & Giờ HH:mm (FR-08.4)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/conversations/{{conversation_id}}/messages`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK`, các tin nhắn từ đối phương tự động chuyển thành `is_read: true`, `status_display: "Đã xem"`, đồng thời phát sự kiện `MessagesRead` (`messages.read`) qua WebSocket.

#### Test Case 46: Cơ chế bảo mật phòng chat (FR-08.5)
* Dùng tài khoản của người ngoài cuộc trò chuyện gọi `GET` hoặc `POST` vào `/api/conversations/{{conversation_id}}/messages`.
* **Kỳ vọng:** `403 Forbidden: "Bạn không có quyền truy cập vào cuộc trò chuyện này"`.

#### Test Case 47: Duy trì liên lạc khi tin đóng & Kèm nhãn phụ (FR-08.6)
* Sau khi tin tuyển dụng bị đóng (`status = 'closed'`), cả NTD và Ứng viên vẫn gửi/nhận tin nhắn bình thường (trả `201 Created`).
* Khi gọi `GET /api/conversations` hoặc xem chi tiết tin nhắn: Trả về `job_status: "closed"` và `job_notice: "Tin tuyển dụng đã đóng"`.

---

### 4.7. Module Hệ thống Thông báo trên Web (Web Notifications)

#### Test Case 48: Nhận thông báo tự động (Ứng viên) (FR-10.1)
* Khi NTD duyệt đơn hoặc gửi tin nhắn mới, Ứng viên tự động nhận được thông báo:
  * Đổi trạng thái: Tiêu đề `"Chúc mừng! Bạn đã trúng tuyển"`, `redirect_url: "/candidate/applications"`.
  * Tin nhắn mới: Tiêu đề `"Tin nhắn mới từ FPT Software"`, `redirect_url: "/messages/{{conversation_id}}"`.

#### Test Case 49: Nhận thông báo tự động (Nhà tuyển dụng) (FR-10.2)
* Khi có ứng viên nộp hồ sơ hoặc gửi tin nhắn, NTD tự động nhận được thông báo:
  * Ứng viên nộp đơn: Tiêu đề `"Ứng viên mới nộp hồ sơ"`, `redirect_url: "/employer/jobs/{{job_id}}/applications"`.
  * Tin nhắn mới: Tiêu đề `"Tin nhắn mới từ Trần Văn An"`, `redirect_url: "/messages/{{conversation_id}}"`.

#### Test Case 50: Xem danh sách thông báo & Badge chuông (FR-10.3)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/notifications`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK`, trả về `unread_count >= 1`, mỗi thông báo có:
  * `time_ago`: Hiển thị dạng `"vừa xong"`, `"5 phút trước"`...
  * `background_color`: `"blue"` (chưa đọc) hoặc `"white"` (đã đọc).
  * `status_display`: `"Chưa đọc"` hoặc `"Đã đọc"`.
  * `redirect_url`: Đường dẫn điều hướng chính xác.

#### Test Case 51: Đánh dấu 1 thông báo là đã đọc (FR-10.3)
* **Method:** `PATCH`
* **URL:** `http://localhost:8000/api/notifications/{{notification_id}}/read`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK`, `is_read = true`, `unread_count` giảm đi 1.

#### Test Case 52: Đánh dấu tất cả thông báo là đã đọc (FR-10.3)
* **Method:** `PATCH`
* **URL:** `http://localhost:8000/api/notifications/read-all`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK: "Đã đánh dấu tất cả thông báo là đã đọc"`, `unread_count = 0`.

#### Test Case 53: Lọc thông báo theo trạng thái (FR-10.3)
* Lọc chưa đọc: `GET /api/notifications?status=unread` -> Chỉ trả về thông báo chưa đọc, `background_color = "blue"`.
* Lọc đã đọc: `GET /api/notifications?status=read` -> Chỉ trả về thông báo đã đọc, `background_color = "white"`.

#### Test Case 54: Xóa 1 thông báo
* **Method:** `DELETE`
* **URL:** `http://localhost:8000/api/notifications/{{notification_id}}`
* **Headers:** `Authorization: Bearer {{candidate_token}}`
* **Kỳ vọng:** `200 OK: "Đã xóa thông báo thành công"`.

---

### 4.8. Module Quản trị viên (Admin Dashboard & Moderation)

#### Test Case 55: Lấy số liệu thống kê Dashboard (FR-09)
* **Method:** `GET`
* **URL:** `http://localhost:8000/api/admin/stats`
* **Headers:** `Authorization: Bearer {{admin_token}}`
* **Kỳ vọng:** `200 OK`, trả về `total_candidates`, `total_employers`, `total_jobs`, `active_jobs`, `total_applications`, `reported_jobs`, `recent_jobs`.

#### Test Case 56: Khóa tài khoản người dùng vi phạm (FR-09.4)
* **Method:** `PATCH`
* **URL:** `http://localhost:8000/api/admin/users/3/status`
* **Headers:** `Authorization: Bearer {{admin_token}}`
* **Body:** `{ "status": "locked" }`
* **Kỳ vọng:**
  * `200 OK: "Đã cập nhật trạng thái người dùng thành công"`.
  * Toàn bộ token đăng nhập hiện có của user bị thu hồi ngay lập tức.

#### Test Case 57: Chặn đăng nhập với tài khoản bị khóa (FR-02.5)
* Gọi `POST /api/login` với tài khoản vừa bị khóa ở Test Case 56.
* **Kỳ vọng:** `403 Forbidden: "Tài khoản của bạn đã bị khóa bởi quản trị viên"`.
* Mở khóa tài khoản: Gửi lại request với `{ "status": "active" }`.

---

## 5. Bảng đối chiếu mã trạng thái HTTP & Thông báo lỗi chuẩn SRS

Hệ thống tuân thủ 100% bảng ánh xạ mã lỗi theo **Phụ lục B SRS** và Controllers:

| HTTP Code | Tình huống phát sinh lỗi | Message hiển thị chuẩn tiếng Việt |
|---|---|---|
| `400 Bad Request` | Hạn nộp hồ sơ ở quá khứ hoặc hôm nay | `"Hạn nộp hồ sơ phải sau ngày hôm nay"` |
| `400 Bad Request` | Upload file CV không phải PDF hoặc > 5MB | `"Chỉ chấp nhận file định dạng PDF dung lượng dưới 5MB"` |
| `400 Bad Request` | Lương tối thiểu lớn hơn lương tối đa | `"Mức lương tối thiểu không được lớn hơn mức lương tối đa"` |
| `400 Bad Request` | Chưa cập nhật thông tin công ty trước khi đăng tin | `"Vui lòng cập nhật đầy đủ thông tin công ty (Tên, Giới thiệu, Trụ sở, Tỉnh/Thành phố) trước khi đăng tin tuyển dụng đầu tiên"` |
| `400 Bad Request` | Chọn nộp CV mới nhưng không gửi file PDF | `"Vui lòng tải lên file CV PDF cho vị trí này"` |
| `400 Bad Request` | Rút hồ sơ khi Nhà tuyển dụng đã mở xem CV | `"Nhà tuyển dụng đã xem hồ sơ của bạn, không thể rút đơn"` |
| `400 Bad Request` | Ứng viên chưa nộp đơn mà cố tạo phòng chat | `"Phòng trò chuyện chỉ được tạo khi ứng viên đã nộp hồ sơ vào tin tuyển dụng này"` |
| `400 Bad Request` | Gửi tin nhắn rỗng hoặc chỉ chứa khoảng trắng/enter | `"Nội dung tin nhắn không được để trống hoặc chỉ chứa khoảng trắng"` |
| `400 Bad Request` | Gửi tin nhắn vượt quá 1.000 ký tự | `"Nội dung tin nhắn không được vượt quá 1.000 ký tự"` |
| `400 Bad Request` | Nhập sai mật khẩu hiện tại khi đổi mật khẩu | `"Mật khẩu hiện tại không chính xác"` |
| `400 Bad Request` | Mật khẩu mới trùng với mật khẩu hiện tại | `"Mật khẩu mới không được trùng với mật khẩu hiện tại"` |
| `400 Bad Request` | Token đặt lại mật khẩu đã hết hạn (>15p) hoặc không hợp lệ | `"Liên kết xác thực đã hết hạn hoặc không hợp lệ"` |
| `401 Unauthorized` | Chưa truyền Bearer token hoặc token đã hết hạn | `"Phiên làm việc đã hết hạn, vui lòng đăng nhập lại"` (hoặc `"Unauthenticated."`) |
| `401 Unauthorized` | Đăng nhập sai Email hoặc Mật khẩu | `"Email hoặc mật khẩu không chính xác"` |
| `403 Forbidden` | Đăng nhập vào tài khoản đã bị Admin khóa | `"Tài khoản của bạn đã bị khóa bởi quản trị viên"` |
| `403 Forbidden` | Nhập sai mật khẩu liên tiếp 5 lần | `"Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản"` |
| `403 Forbidden` | Nhà tuyển dụng cố tình nộp đơn ứng tuyển | `"Chỉ tài khoản Ứng viên mới có quyền nộp đơn ứng tuyển"` |
| `403 Forbidden` | Người ngoài cố xem hoặc gửi tin vào phòng chat | `"Bạn không có quyền truy cập vào cuộc trò chuyện này"` |
| `403 Forbidden` | Truy cập sai quyền (Candidate vào route Employer/Admin) | `"Bạn không có quyền truy cập vào chức năng này"` |
| `404 Not Found` | Xem tin tuyển dụng không tồn tại hoặc đã ngừng | `"Công việc không tồn tại hoặc đã ngừng tuyển dụng"` |
| `404 Not Found` | Yêu cầu quên mật khẩu với email không tồn tại | `"Email không tồn tại trong hệ thống"` |
| `409 Conflict` | Ứng viên nộp hồ sơ lần thứ 2 cho cùng 1 việc làm | `"Bạn đã nộp hồ sơ cho công việc này rồi"` |
| `422 Unprocessable`| Đăng ký với Email đã tồn tại | `"Email đã được sử dụng"` |
| `422 Unprocessable`| Nộp hồ sơ vào tin đã đóng hoặc hết hạn | `"Tin tuyển dụng này đã đóng hoặc đã hết hạn nộp hồ sơ"` |

---

## 6. Xử lý sự cố thường gặp (Troubleshooting)

### 6.1. File upload (CV / Avatar / Logo / Ảnh chat) bị lỗi 404 khi mở URL
* **Nguyên nhân:** Chưa tạo symbolic link giữa thư mục `storage/app/public` và `public/storage`.
* **Khắc phục:** Chạy lệnh:
  ```bash
  cd backend
  php artisan storage:link
  ```

### 6.2. Lỗi CORS khi gọi API từ Frontend Next.js (`http://localhost:3000`)
* **Nguyên nhân:** File `config/cors.php` chưa cho phép origin hoặc methods.
* **Khắc phục:** Đảm bảo `config/cors.php` có:
  ```php
  'paths' => ['api/*', 'sanctum/csrf-cookie'],
  'allowed_origins' => ['http://localhost:3000'],
  'supports_credentials' => true,
  ```

### 6.3. Chưa có Google Gemini API Key
* Hệ thống được trang bị **cơ chế Fallback Heuristic thông minh**: Dù bạn chưa điền API Key hoặc API Key bị hết hạn ngạch (quota limit), API Nộp đơn ứng tuyển vẫn chấm điểm Match Score chính xác dựa trên độ trùng khớp kỹ năng và năm kinh nghiệm trong CSDL mà không bao giờ bị báo lỗi 500.
* Để kích hoạt AI Gemini 1.5 Flash thực tế, chỉ cần dán API Key vào dòng `GEMINI_API_KEY=...` trong file `backend/.env`.

### 6.4. Chưa bật máy chủ WebSocket Reverb khi test Chat hoặc Notifications
* Khi chạy bộ test tự động `php test_all_backend.php`, hệ thống có cơ chế bắt ngoại lệ an toàn `try ... catch` quanh lệnh broadcast, do đó test suite vẫn chạy thành công 58/58 tests ngay cả khi Reverb chưa bật.
* Tuy nhiên khi test trực tiếp trên trình duyệt hoặc Next.js Frontend, hãy đảm bảo luôn khởi chạy `php artisan reverb:start` trên 1 cửa sổ Terminal riêng biệt.
