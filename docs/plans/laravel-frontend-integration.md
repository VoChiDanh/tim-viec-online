# Đối chiếu frontend và Laravel — 17/10/2026

> Cập nhật 19/10/2026: đã bổ sung `AUTH_MODE=mock` với hai tài khoản và bảo vệ toàn bộ route tài khoản, kể cả alias `/preview/*`. Hướng dẫn hiện hành: [mock-auth.md](mock-auth.md). Phần dưới lưu kết quả đối chiếu backend ngày 17/10; `AUTH_MODE=preview` không đăng nhập được và không mở được trang riêng.

## Kết luận

Frontend Next.js hiện tại có thể dùng với Laravel REST API. Giao diện không phụ thuộc Blade hoặc database trực tiếp; code gọi API nằm trong `frontend/src/services`. Tuy nhiên backend trong repository chưa đủ chức năng để bật xác thực và tìm việc thật. Kết quả dưới đây xác nhận kiến trúc, hợp đồng và các phần thiếu; không phải nghiệm thu tích hợp đầu cuối với database/email thật.

Đã đọc code và chạy `php artisan --version`, `php artisan route:list --path=api` từ `backend/`: Laravel **11.57.0**, chỉ có **GET|HEAD api/user**. `composer.lock` ghi Sanctum **4.3.3**, Reverb **1.12.0**. Không áp dụng ví dụ Laravel 13 từ skill cho code Laravel 11.

## Những gì cần khớp trước khi bật API

| Phần | Frontend hiện có | Backend hiện có / việc cần hoàn thiện |
| --- | --- | --- |
| Xác thực | Server Actions gọi API qua adapter server-only, Bearer token ở cookie HttpOnly của Next.js, xác minh user trên server | Chỉ có route `/api/user` bảo vệ bằng `auth:sanctum`; chưa có login/register/logout/forgot/reset/change-password. |
| Phản hồi JSON | Yêu cầu `{success:true,data:...}` và xử lý lỗi HTTP/422 cạnh trường | `/api/user` đang trả model thô; cần Resource/envelope theo AGENTS.md. |
| Vai trò và tài khoản | Nhận `id`, `name`, `email`, `role`, `status`; role chỉ nhận candidate/employer/admin, trạng thái active/locked | User/migration mặc định chưa có role/status/phone/dob. Cần migration và authorization backend; SQL dump chưa tự biến thành migration Laravel. |
| Token API nếu giữ adapter hiện tại | Nhận `token` hoặc `access_token`, nên có `expires_at`; frontend thu hồi token qua logout | User chưa dùng `HasApiTokens`; cấu hình Sanctum `expiration` đang null. Backend cần cấp token có hạn, thu hồi khi logout/khóa tài khoản. Hạn cookie không thay thế hạn token. |
| Quên/đặt lại mật khẩu | Gửi email/token/password/password_confirmation, hiển thị thông báo trung tính | Broker hiện đặt `expire=60`, khác **15 phút** của SRS. Cần endpoint, email liên kết đúng URL frontend, token dùng một lần. |
| Đổi mật khẩu | PUT `/api/user/change-password` gửi current_password/password/password_confirmation | Chưa có endpoint. README gốc dùng new_password; cần thống nhất tên trường rồi sửa mapping ở adapter nếu cần, không sửa form. |
| Tìm việc | Repository `jobs.ts` tách UI khỏi nguồn dữ liệu; lọc, phân trang, chi tiết hiện dùng fixture | Chưa có route jobs/categories/skills/company. Khi API có, thay repository bằng adapter và thống nhất DTO, phân trang, salary, deadline, category_ids, sort theo SRS. |
| Chat/Reverb | Đã có thư viện Echo/Pusher trong frontend; chưa triển khai chat | Có dependency Reverb nhưng chưa phải luồng chat hoạt động; cần API hội thoại/tin nhắn và authorization private channel. |

## Cơ chế xác thực cần thống nhất trong nhóm

[Sanctum Laravel 11](https://laravel.com/docs/11.x/sanctum#spa-authentication) có cơ chế cookie/session dành cho first-party SPA. Nếu nhóm chọn cách này, cần stateful middleware, cấu hình domain/CORS/credentials, CSRF handshake và thay lớp session/API adapter hiện tại. Form, layout, validation và phần lớn trang không cần viết lại.

Adapter hiện tại là **BFF token**: trình duyệt gửi form tới Next.js; Next.js gọi Laravel, không gửi Bearer token cho JavaScript trình duyệt. Cơ chế này có thể làm việc với API token của Sanctum nếu backend triển khai đúng hợp đồng. Nó không phải adapter Sanctum SPA cookie có sẵn. Không được trộn quy trình `/sanctum/csrf-cookie` của SPA với cookie `timviec_session` của BFF và kỳ vọng chúng tự thay thế nhau. [Tài liệu API token và HasApiTokens](https://laravel.com/docs/11.x/sanctum#api-token-authentication).

Hợp đồng endpoint/DTO và các code lỗi frontend hỗ trợ nằm trong [auth-frontend.md](auth-frontend.md). Phân quyền, validation FormRequest, unique email, tạo hồ sơ theo role và kiểm tra upload vẫn thuộc backend.

## Cấu hình khi backend đã đáp ứng hợp đồng BFF

Trong file môi trường **cục bộ** của frontend:

```dotenv
AUTH_MODE=api
AUTH_API_URL=http://localhost:8000/api
AUTH_APP_URL=http://localhost:3000
```

Production dùng HTTPS và URL đúng tên miền triển khai; AUTH_API_URL là cấu hình server. Giữ `AUTH_MODE=preview` trong lúc endpoint còn thiếu. Không đưa khóa Gemini hoặc thông tin database vào biến NEXT_PUBLIC.

Fixture API trong Playwright xác nhận hành vi adapter, cookie, role và lỗi form; không thay thế kiểm thử với Laravel. Bước tích hợp thật tiếp theo là backend hoàn thành auth theo hợp đồng đã chọn, sau đó nghiệm thu đăng ký hai role → đăng nhập → `/user` → đổi mật khẩu → logout và kiểm tra phiên bị khóa/hết hạn. Chưa chạy migration hoặc thay đổi backend/database trong lần rà soát này.
