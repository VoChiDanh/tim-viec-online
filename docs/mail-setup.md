# Gửi email tài khoản

Laravel Mail đã xử lý email đăng ký và khôi phục mật khẩu bằng SMTP (Symfony Mailer). Không cần cài PHPMailer hoặc tạo một endpoint gửi email công khai. Email có bản HTML và text, nội dung tiếng Việt; không gửi mật khẩu người dùng.

## Gmail SMTP — cổng 465

Bật xác minh hai bước trong tài khoản Google và tạo **mật khẩu ứng dụng mới** tại [Google App Passwords](https://myaccount.google.com/apppasswords). Không sử dụng mật khẩu đăng nhập Gmail thông thường. Nếu một mật khẩu ứng dụng đã được chia sẻ trong chat, ảnh hoặc source code, thu hồi mã đó và tạo mã khác.

Nhập trực tiếp vào `backend/.env`:

```dotenv
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=dia-chi-gmail-cua-ban@gmail.com
MAIL_PASSWORD=mat-khau-ung-dung-moi-khong-co-khoang-trang
MAIL_FROM_ADDRESS=dia-chi-gmail-cua-ban@gmail.com
MAIL_FROM_NAME="TimViecOnline"
MAIL_REQUIRE_TLS=true
MAIL_TIMEOUT=5

AI_ANALYSIS_ENABLED=false
```

Thay các giá trị minh họa bằng thông tin của bạn. `MAIL_FROM_ADDRESS` nên trùng tài khoản Gmail gửi. Bỏ `MAIL_URL` nếu có để tránh ghi đè các trường SMTP. Không đưa `MAIL_PASSWORD` vào frontend, ảnh chụp hoặc Git. `.env` đã được ignore.

Gmail cũng hỗ trợ cổng 587: đổi `MAIL_SCHEME=smtp`, `MAIL_PORT=587` và giữ `MAIL_REQUIRE_TLS=true` để yêu cầu STARTTLS. Laravel/Symfony hiện tại dùng `MAIL_SCHEME`, không dùng khóa cấu hình cũ `MAIL_ENCRYPTION`.

## Kiểm tra và chạy

Tại thư mục `backend`:

```powershell
php artisan config:clear
php artisan mail:check
```

Lệnh trên chỉ kiểm tra đủ cấu hình; **chưa đăng nhập SMTP hoặc gửi thư**. Để gửi thử, truyền địa chỉ hộp thư bạn kiểm soát:

```powershell
php artisan mail:check --to=dia-chi-nhan-cua-ban@example.com
```

Thông báo SMTP nhận thư không bảo đảm thư đã vào inbox: kiểm tra cả Thư rác/Spam. Lệnh không in mật khẩu, token hoặc lỗi SMTP thô. Khởi động lại `php artisan serve --port=8000` sau khi chỉnh cấu hình; dùng `config:cache` sau khi cấu hình production đã đúng. URL frontend được lưu trong config nên vẫn hoạt động khi cache.

Gửi mail hiện đồng bộ; **không cần queue worker cho hai loại email này**. Timeout được giới hạn 1–8 giây mỗi thao tác socket; mặc định 5 giây. Đây không phải cam kết tổng thời gian gửi. Tránh mailer `failover` với đích `log` nếu cần xác nhận gửi thật.

## Thử luồng ứng dụng

1. Đăng ký bằng email bạn sở hữu: nhận thư chào mừng, sau đó đăng nhập.
2. Đăng xuất và mở `/forgot-password`, nhập email đó. Phản hồi giống nhau dù email có tồn tại để tránh dò tài khoản.
3. Mở thư khôi phục, bấm nút đặt lại mật khẩu. Liên kết về `FRONTEND_URL/reset-password`, có hạn 15 phút, chỉ dùng một lần; yêu cầu thư mới làm liên kết trước đó hết hiệu lực.
4. Đổi mật khẩu, đăng nhập với mật khẩu mới. Các phiên đăng nhập trước reset bị thu hồi. Mật khẩu cũ và liên kết đã dùng không còn hiệu lực.

Liên kết lỗi/hết hạn có nút yêu cầu liên kết mới. Nếu API tạm ngừng, giao diện báo chưa kiểm tra được liên kết thay vì kết luận đã hết hạn. Backend chỉ lưu hash token và không ghi URL/token vào log khi SMTP lỗi. Gửi thất bại sẽ xóa đúng token chưa giao, không xóa token của yêu cầu mới hơn.

Giới hạn gửi lại: 3 yêu cầu/15 phút cho một email (dùng chung giữa các alias), kèm giới hạn tổng theo IP; không dùng chung bộ đếm với đăng nhập. Email xác nhận đăng ký không quyết định kết quả tạo tài khoản: nếu SMTP lỗi, tài khoản vẫn đăng nhập được và backend ghi nhận lỗi an toàn.

## Khi chưa nhận được thư

- Kiểm tra `MAIL_MAILER=smtp`. `log` ghi thư vào log; `array` chỉ giữ trong bộ nhớ, không giao thư.
- Gmail báo sai xác thực: tạo lại App Password, nhập đủ 16 ký tự không có dấu cách; kiểm tra chính sách tài khoản Google Workspace. Không bật SMTP debug trên giao diện.
- Kết nối timeout: kiểm tra mạng/firewall có cho kết nối ra cổng 465/587; XAMPP/PHP cần OpenSSL và chứng chỉ CA hợp lệ. Không tắt xác minh chứng chỉ để sửa lỗi.
- Thư trỏ sai địa chỉ: kiểm tra `FRONTEND_URL`, xóa cache config và yêu cầu **thư mới**.
- Hộp thư không thuộc bạn hoặc địa chỉ gõ sai: dùng địa chỉ bạn kiểm soát, không thử gửi hàng loạt.

## Kiểm thử tự động

Backend có regression tests cho MIME HTML/text, URL frontend, SMTP lỗi không lộ thông tin, đầu vào token, hạn 15 phút và dùng một lần. `npm run test:backend` trong frontend khởi chạy thêm SMTP sink chỉ bind `127.0.0.1:8129`, không relay ra Internet; chỉ nhận `*@frontend-e2e.test`. Thư nằm trong storage kiểm thử đã ignore, dùng database riêng `frontend_api_e2e_test` trên cổng 33063. Không dùng bộ thử nghiệm này làm cấu hình chạy ứng dụng.

Tham khảo: [Gmail SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp), [Google App Passwords](https://support.google.com/accounts/answer/185833), [Laravel 12 Mail](https://laravel.com/docs/12.x/mail), [Symfony TLS](https://symfony.com/doc/current/mailer.html#ensure-tls).
