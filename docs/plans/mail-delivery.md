# Email tài khoản và khôi phục mật khẩu

> Cập nhật 27/10/2026: email đăng ký đã chuyển sang xác nhận quyền sở hữu; thông báo tùy chọn qua queue được triển khai tiếp tại [kế hoạch xác nhận và thông báo](email-verification-notifications.md). Phần dưới ghi nhận đợt triển khai khôi phục ban đầu.

> Thực hiện trực tiếp theo `executing-plans`, kiểm thử trước khi sửa hành vi và commit từng phần.

**Mục tiêu:** Email đăng ký và liên kết đặt lại mật khẩu gửi được qua SMTP, nội dung tiếng Việt đồng bộ thương hiệu. Luồng khôi phục tuân thủ SRS FR-01.6, FR-02.7 và FR-02.8.

**Kiến trúc:** Giữ gửi đồng bộ với timeout SMTP hữu hạn; không đưa token khôi phục vào queue hoặc log. Tách xử lý khôi phục vào service; frontend xác thực token qua POST trước khi hiển thị form. Cấu hình qua `.env`, không lưu credentials vào Git. Kiểm thử bằng SMTP local và database riêng, không gửi tới hộp thư bên ngoài.

**Ràng buộc:** Token băm trong DB, hết hạn sau 15 phút, dùng một lần, thu hồi phiên cũ. Phản hồi quên mật khẩu không tiết lộ email tồn tại. Không thay đổi khóa admin, không bật AI, không thêm email marketing hay email cho mỗi tin chat.

**Điểm cần kiểm tra:** URL khi cache config; SMTP lỗi/thiếu cấu hình; giới hạn gửi theo email và IP; token sai/hết hạn/đã dùng; HTML escape và MIME text; không trộn database kiểm thử với database phát triển.

## Các phần triển khai

- [x] Viết regression test backend cho cấu hình URL/SMTP, lỗi gửi, validation, mã lỗi token và rate limit độc lập; chạy để xác nhận lỗi hiện tại.
- [x] Hoàn thiện `PasswordRecoveryService`, FormRequest kiểm tra token, config frontend URL/SMTP/TLS/timeout và rate limit riêng. Giữ hợp đồng API thành công hiện có.
- [x] Hoàn thiện email reset và đăng ký với HTML inline cùng bản text; thêm `mail:check` kiểm tra cấu hình, chỉ gửi thử khi truyền `--to` rõ ràng.
- [x] Frontend kiểm tra token trước form, phân biệt lỗi kết nối với liên kết sai, cho phép yêu cầu liên kết mới. Kiểm thử hợp đồng và giao diện.
- [x] SMTP fixture chỉ bind loopback, ghi thư trong storage kiểm thử đã ignore; browser kiểm tra email đăng ký → yêu cầu reset → mở thư → đổi mật khẩu → đăng nhập → từ chối dùng lại token.
- [x] Chạy bộ backend/frontend liên quan, lint/build, review độc lập; cập nhật hướng dẫn Gmail/SMTP và trạng thái kiểm thử. Commit từng phần, chưa push/merge.

## Cấu hình gửi thật

Người dùng cung cấp ví dụ Gmail SMTP cổng 465. Dùng Laravel Mail với cùng cấu hình SMTP; không cần thêm PHPMailer. Mật khẩu ứng dụng đã chia sẻ phải được thu hồi và thay bằng mã mới. Người dùng nhập credentials trực tiếp vào `backend/.env`; không gửi mật khẩu/API key qua hội thoại. Không tuyên bố đã gửi tới hộp thư thật khi chưa kiểm tra việc nhận thư.

## Ghi nhận review

Review độc lập phát hiện mật khẩu Unicode có thể vượt giới hạn 72 byte của bcrypt. Đã thêm kiểm tra frontend/backend và regression test từ chối mật khẩu quá giới hạn, giữ nguyên mật khẩu cũ và token hợp lệ. Giữ hỗ trợ Unicode và ký tự đặc biệt theo SRS.

SMTP thực tế phát hiện `MAIL_URL` rỗng khiến Laravel ghi đè transport thành null. Đã chuẩn hóa giá trị rỗng thành null trong config, kiểm tra tạo transport thật không cần mạng và chạy lại toàn bộ luồng email qua SMTP sink.

## Bằng chứng kiểm thử 26/10/2026

- Backend: 55 test, 287 assertions đạt trên database riêng `pr3_review_test`, cổng 33063.
- Frontend: 94 unit test và 10 server/auth test đạt; ESLint và production build đạt.
- Trình duyệt với HTTP fixture: 19 test xác thực đạt, gồm lỗi token và API tạm ngừng.
- Trình duyệt với Laravel/Reverb thật: 4 luồng nghiệp vụ hiện có đạt. Sau sửa transport, luồng SMTP riêng đạt: đăng ký qua UI, nhận email HTML/text, lấy URL từ thư, reset qua UI, đăng nhập bằng mật khẩu mới, từ chối mật khẩu cũ và token đã dùng.
- Review độc lập đã kiểm tra lại giới hạn bcrypt và xác nhận không còn phát hiện cụ thể.
- Cấu hình máy phát triển khi kiểm tra vẫn là `MAIL_MAILER=log`; chưa gửi tới Gmail thật. Người dùng cần nhập mật khẩu ứng dụng mới theo [hướng dẫn](../mail-setup.md), sau đó dùng `mail:check --to=...` để kiểm tra hộp thư mình kiểm soát.
