# Đăng nhập mẫu và chuyển sang Laravel

Frontend dùng cùng form, Server Actions, cookie và kiểm tra quyền cho hai chế độ. Chỉ lớp `frontend/src/services/auth-request.ts` chọn nguồn xác thực; không có cơ chế tự chuyển sang mock khi Laravel lỗi.

## Chạy với hai tài khoản mẫu

Trong `frontend/.env.local`:

```dotenv
AUTH_MODE=mock
AUTH_APP_URL=http://localhost:3000
```

Khởi động lại `npm run dev` trong `frontend/` sau khi thay cấu hình. Truy cập `/login` và sử dụng các thông tin demo công khai dưới đây; không dùng mật khẩu này cho tài khoản thật.

| Vai trò | Email | Mật khẩu | Trang sau đăng nhập |
| --- | --- | --- | --- |
| Ứng viên | `candidate@example.test` | `Candidate@123` | `/jobs` hoặc trang tài khoản vừa yêu cầu |
| Nhà tuyển dụng | `employer@example.test` | `Employer@123` | `/employer` |

Mock hỗ trợ đăng nhập, lấy user hiện tại, đăng xuất và đổi mật khẩu. Đăng ký mới và gửi email quên/đặt lại mật khẩu vẫn chỉ kiểm tra giao diện, không tạo tài khoản hoặc gửi email giả. Khu vực nhà tuyển dụng đã có tổng quan, hồ sơ công ty, đăng/sửa/đóng/mở tin, ứng viên, chat và thông báo bằng dữ liệu phiên xem trước; xem [employer-frontend.md](employer-frontend.md).

## Quyền truy cập

- Khách chỉ xem trang công khai: home, jobs và công ty; truy cập trực tiếp trang riêng chuyển đến đăng nhập.
- `/account/profile`, `/account/jobs`, `/account/messages`, `/account/notifications`, `/account/settings`: chỉ ứng viên đã đăng nhập. Dữ liệu mock hồ sơ lấy tên/email từ user đã được server xác minh.
- `/employer` và toàn bộ trang con chỉ nhà tuyển dụng; `/admin` chỉ admin. Mock không cấp tài khoản admin.
- `/account/security` cho mọi tài khoản đã đăng nhập để đổi mật khẩu.
- `/preview/*` là alias được bảo vệ: phải đăng nhập đúng vai trò trước khi chuyển đến `/account/*`. Không còn đường xem hồ sơ công khai qua preview.
- Mỗi lần đọc dữ liệu riêng đều kiểm tra phiên/vai trò ở server. Layout bổ sung provider sau khi đã xác minh user; không dựa vào việc ẩn menu hoặc kiểm tra localStorage.

Cookie `timviec_session` là HttpOnly, SameSite=Lax, Secure khi chạy production. Token ngẫu nhiên 256 bit; server chỉ lưu SHA-256 token, user ID và hạn sử dụng. Phiên thông thường hết hạn sau một giờ; ghi nhớ đăng nhập tối đa bảy ngày. Logout thu hồi phiên trên server và xóa cache điều hướng; đổi mật khẩu thu hồi các phiên khác.

Store mock chỉ nằm trong bộ nhớ một process Next.js: khởi động lại server sẽ đặt lại mật khẩu demo và hủy phiên. Thay đổi hồ sơ/CV/tin nhắn mock vẫn nằm trong state giao diện, mất khi tải lại trang. Cơ chế này dành cho phát triển và kiểm thử một instance, không thay cho xác thực hoặc lưu trữ production.

## Ghép Laravel

Khi Laravel triển khai đúng hợp đồng, chuyển cấu hình và khởi động lại frontend:

```dotenv
AUTH_MODE=api
AUTH_API_URL=http://localhost:8000/api
AUTH_APP_URL=http://localhost:3000
```

Production cấu hình URL HTTPS thực tế. `AUTH_APP_URL` là origin tin cậy dùng kiểm tra các thao tác xác thực; phải khớp origin trình duyệt. Không đưa Bearer token vào JavaScript hoặc localStorage.

| Endpoint Laravel | Hợp đồng frontend |
| --- | --- |
| `POST /api/login` | Nhận `email`, `password`, `remember`; trả `{success:true,data:{token,expires_at}}` (`access_token` cũng được chấp nhận). |
| `GET /api/user` | Nhận Bearer token; trả `{success:true,data:{id,name,email,role,status}}`. Role thuộc candidate/employer/admin; status active/locked. |
| `POST /api/logout` | Thu hồi token; trả `{success:true,data:null}`. |
| `PUT /api/user/change-password` | Nhận `current_password`, `password`, `password_confirmation`; kiểm tra, cập nhật và thu hồi các phiên khác tại backend. |

Chi tiết đăng ký, email, lỗi 422 và các endpoint khác: [auth-frontend.md](auth-frontend.md). Adapter hiện tại là BFF dùng **Sanctum API token**: trình duyệt chỉ gửi cookie cho Next.js, Next.js gọi Laravel. Nếu nhóm đổi sang Sanctum SPA cookie thì cần thay adapter/session để xử lý stateful cookies và CSRF; không chỉ đổi URL.

Việc bật API không tự ghép dữ liệu profile, CV, ứng tuyển hoặc chat. Các service `candidate-profile.ts` và `candidate-workspace.ts` là vị trí tiếp tục tích hợp khi endpoint tương ứng có sẵn. Ở chế độ API, các trang chưa có endpoint hiển thị trạng thái chưa khả dụng, tuyệt đối không dùng dữ liệu mẫu thay cho dữ liệu thật. Backend phải tự kiểm tra quyền sở hữu, role và tài khoản bị khóa trên mọi endpoint.

## Kiểm chứng

```sh
npm run lint
npm run build
npm test
npm run test:mock-auth
npm run test:e2e
npm run test:auth
```

Kiểm thử server bao gồm cookie giả, sửa role, hết phiên, thu hồi phiên và đổi mật khẩu. Kiểm thử trình duyệt bao gồm URL riêng/alias, login/refresh/logout/Back, phân quyền hai vai trò và luồng API qua fixture; fixture API không thay thế nghiệm thu với Laravel/MySQL thật.
