# Ghép frontend với Laravel, chưa triển khai AI

Phạm vi: toàn bộ luồng hiện có (public/auth/candidate/employer/admin), giữ UI và mock mode phục vụ demo, API mode chỉ dùng dữ liệu backend. Token Sanctum trong cookie HttpOnly; browser gọi proxy cùng origin có allowlist và kiểm tra Origin cho thao tác ghi. Không nhận URL backend tùy ý từ client; file riêng tư đi qua proxy sau phân quyền server.

- [x] Transport/proxy: JSON, multipart, file, lỗi validation, phiên hết hạn; không fallback dữ liệu mock.
- [x] Public: home/tin/công ty/danh mục từ API, filter/sort/pagination backend đúng hợp đồng.
- [x] Candidate: hồ sơ/avatar/CV, lưu việc, apply/withdraw/history, chat và thông báo thật.
- [x] Employer: công ty/logo, tạo/sửa/đóng/mở tin, danh sách/chi tiết/CV/xét duyệt, chat/thông báo thật.
- [x] Admin: thống kê, users/lock, báo cáo/xóa tin, danh mục/kỹ năng CRUD thật.
- [x] Reverb xác thực qua proxy; cập nhật read/unread và tin nhắn; đối soát khi reconnect/focus.
- [x] AI tắt mặc định ở backend và ẩn dữ liệu/điều khiển AI trong API UI.
- [x] Kiểm thử unit/contracts và E2E trên Laravel + database riêng, duy trì kiểm tra mock và tài liệu cấu hình.

## Bằng chứng kiểm thử ngày 26/10/2026

- Laravel: 44 test, 219 assertions; gồm phân quyền, hợp đồng tìm kiếm, hồ sơ theo nhà tuyển dụng và chặn phân tích khi AI tắt.
- Frontend: 92 unit test và 10 server/auth test; ESLint, typecheck và production build đạt.
- Chromium mock: 197 test đạt; xác thực qua HTTP fixture: 18 test đạt.
- Sau thay đổi cuối ở trang public, chạy lại 20 test trang chủ/navbar/sidebar: đạt, gồm kích thước responsive, khả năng truy cập và mở menu/ngăn thông báo không dịch nội dung.
- Chromium với Laravel/MySQL/Reverb thật: 4 luồng đầu cuối đạt. Kiểm tra lưu hồ sơ/avatar/CV, tìm kiếm/lưu/nộp/rút đơn, công ty/logo/tin tuyển dụng/xét duyệt, danh mục quản trị và thu hồi phiên khi khóa tài khoản. Chat nhận sự kiện `message.sent` trực tiếp qua WebSocket; kiểm tra đọc và ảnh riêng tư.
- Database kiểm thử tách riêng tại cổng 33063; bộ trình duyệt chỉ reset `frontend_api_e2e_test`, không dùng database phát triển.

Hướng dẫn cấu hình và chạy lại: [Frontend kết nối Laravel](../backend-frontend-integration.md). Các commit tích hợp nằm trên `feature/backend-frontend-api`, chưa tự động push hoặc merge vào `develop`.

Không chạy migration/reset vào database người dùng đang phát triển. Không gọi Gemini hoặc gửi SMTP thật trong đợt này. Tích hợp dữ liệu không thay thế các phép đo tải/uptime trong SRS.
