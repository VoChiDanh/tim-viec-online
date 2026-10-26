# Sửa các lỗi chặn PR #3

Mục tiêu: nhận đóng góp backend an toàn vào develop, giữ lịch sử tác giả và bổ sung commit maintainer.

Phạm vi theo review #5647899907, README/SRS và quyết định ứng viên không được xem AI. Không thay frontend hoặc chạy vào DB phát triển. Dùng worktree review/backend-pr-3, database MariaDB riêng.

- [x] Recovery: không lộ token, phản hồi chung, kiểm tra mail/token hết hạn/dùng lại/thu hồi phiên.
- [x] CV: snapshot bất biến theo đơn; bảo toàn các đơn cũ đang dùng chung file khi thay/xóa CV cá nhân.
- [x] Vòng đời: xem CV đúng employer chuyển waiting nguyên tử; rút đơn/xét duyệt không ghi đè cạnh tranh, không xét duyệt đơn đã rút.
- [x] AI: employer/admin đúng quyền, candidate không nhận assessment; queue bất đồng bộ, failed thật khi PDF không đọc được hoặc provider chưa sẵn sàng.
- [x] Test/CI: database riêng và guard trước reset, fake hai disk, CI fork chỉ quyền đọc; kiểm tra dependency advisory và bản vá tương thích.
- [x] Đối chiếu tài liệu API/SRS và liên kết thông báo với các route frontend hiện có.
- [x] Chạy regression đã đỏ, toàn bộ test, syntax/Composer/audit; review độc lập trước commit/push. Không merge khi kiểm chứng còn lỗi.

Kiểm tra thêm: CV cũ nhiều đơn dùng chung, candidate tự xem CV không đổi trạng thái, request trái quyền không tạo tác dụng phụ, queue dispatch lỗi vẫn giữ đơn đã nộp, AI lỗi không tạo điểm giả.

## Kết quả cục bộ

Ngày 26/10/2026, PHP 8.2.12 / MariaDB 10.4 trong instance riêng:

- `php artisan test`: **37 test / 185 assertions đạt**, bao gồm 8 probe từng đỏ trên PR gốc.
- Composer validate strict, platform requirements và audit locked: đạt, không còn advisory. Nâng Laravel 11.57 → 12.70.1; Collision 8.9.5 và PHPUnit 11.5.57 giữ tương thích PHP 8.2. Không thay đổi migration/database vận hành.
- Pint trên các file PHP thay đổi: đạt; PHP syntax và diff whitespace được kiểm tra.
- Guard thử với tên DB giả không phải DB test: dừng ở bootstrap với lỗi rõ, trước RefreshDatabase/migrations.
- AI dùng PDF giả có chữ và HTTP fake để kiểm tra schema/cache/lỗi/retry; chưa gọi Gemini, gửi SMTP hoặc đo WebSocket thật. `GEMINI_MODEL` cần cấu hình rõ theo tài khoản; không dùng model mặc định chưa xác minh hoặc tạo điểm fallback.
- Thư mục bootstrap/cache được giữ bằng `.gitignore` mẫu để Composer package discovery chạy từ checkout mới.
- Review độc lập sau sửa không phát hiện thêm blocker trong phạm vi các lỗi PR.

CI GitHub phải xanh trên SHA cuối trước khi merge. Giữ lịch sử contributor, không force-push và không xóa nhánh fork.
