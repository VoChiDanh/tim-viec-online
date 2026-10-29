# Kiểm chứng trình tạo CV — 29/10/2026

Chức năng đã triển khai trên `feature/cv-builder`. Hướng dẫn bật và chạy: [cv-builder-setup.md](cv-builder-setup.md). Chưa bật flag hoặc migrate database đang dùng của lập trình viên; các lần migrate/reset trong kiểm thử đều dùng database riêng trên cổng 33063.

## Phạm vi đã có

- Thư viện CV, ba mẫu Classic/Modern/Minimal, nhập liệu, thứ tự/ẩn mục và ảnh riêng cho từng CV.
- Tự lưu tuần tự theo revision; không ghi đè khi hai tab xung đột; giữ nội dung chưa lưu và cho lưu thành bản mới.
- Preview dùng cùng template/PDF với renderer, chạy tạo PDF trong Web Worker; PDF.js vẽ trang trực tiếp trên desktop/mobile.
- Export bất biến trên queue `cv`, kiểm tra tối đa 5 trang/5 MB, font tiếng Việt cục bộ, retry có giới hạn và token ngăn job cũ công bố kết quả.
- Ứng tuyển bằng PDF đã xuất; mỗi đơn giữ bản sao riêng. Xóa/sửa bản nháp không thay CV đã nộp. Không gọi AI khi chỉnh sửa/xuất; AI sau ứng tuyển giữ quy tắc bỏ qua dữ liệu demo.
- Feature flag, upload ảnh đã tái mã hóa, file private có kiểm tra quyền, lệnh dọn file và health check hàng đợi.

## Kiểm thử

Windows: PHP 8.2.12, Node 22.23.2, MySQL/MariaDB disposable trên 33063. PHP CLI kiểm thử bật GD bằng `-d extension=gd`; không sửa `php.ini` đang dùng.

| Bộ kiểm tra | Kết quả đã chạy |
|---|---|
| Backend toàn bộ, sau bản vá dependency | Linux CI: 191 tests / 1.904 assertions qua; Windows: 190 tests / 1.894 assertions qua trước khi bổ sung test giới hạn, sau đó riêng `ResumeApiTest` 4 tests / 35 assertions qua |
| Frontend unit / server | 130 / 11 tests qua |
| Node PDF renderer / browser render worker | 2 / 1 tests qua; ba mẫu PDF nhiều trang trích xuất được tiếng Việt |
| Lint / typecheck / production build | Qua |
| E2E Laravel + Node queue thực | Qua: tạo, lưu, reload, upload lỗi, xung đột hai tab, sao chép dirty buffer, export, ứng tuyển, xóa bản nháp, employer tải lại đúng PDF |
| Giao diện | Kiểm tra 360/768/1440px, canvas có nội dung và đúng tỷ lệ trang; axe không có vi phạm trong editor đã kiểm tra |
| Migration | Migrate → rollback ba bảng mới → CV profile cũ còn nguyên → migrate lại; ràng buộc unique export từ chối bản trùng |
| Hồi quy CI cũ | Search/company 18/18 lượt kiểm thử qua; lượt tập trung cuối company/selection 16/16 qua, lặp hai lần và không retry |
| Browser Linux CI cuối | Public 206; auth 28; AI 4; admin performance 4; CV với Laravel thực 1. Các job đều thành công; một test auth cần retry như ghi bên dưới |

Ba lỗi tìm thấy qua review đã sửa và có kiểm thử tái hiện trước khi sửa: file export bị mất không thể tạo lại; deadlock khi copy/export đồng thời; đổi tên trong lúc upload bị ghi đè. Kiểm thử deadlock dùng hai process và khóa MySQL thực.

Đã thêm kiểm thử và sửa việc xóa CV cuối ở trang 2: danh sách tự trở về trang hợp lệ, không báo rỗng khi trang 1 vẫn còn CV.

CI Linux tại commit `b10f467` đã qua cả [Backend](https://github.com/ngocbinh15/tim-viec-online/actions/runs/40817925024) và [Frontend](https://github.com/ngocbinh15/tim-viec-online/actions/runs/40817925055). Bước audit ban đầu phát hiện Symfony Mime 7.4.19 cần bản vá; lockfile đã nâng riêng gói này lên 7.4.22, `composer audit --locked` qua.

Minor còn lại: test accessibility trang auth ở 360px thất bại lượt đầu do contrast 4,34 thay vì 4,5, sau đó qua retry mặc định. Có thể phép đo lấy mẫu giữa hiệu ứng vào trang; chưa xác minh thêm hoặc sửa test này trong phạm vi CV builder. Không tăng retry hay bỏ kiểm tra contrast. CI xanh không có nghĩa toàn bộ bộ kiểm thử cũ đã hết flaky.

## Số đo tải cục bộ

Máy Windows, Intel i5-13500HX, 20 logical CPU, RAM 16 GiB; PHP 8.2.12, Node 22.23.2. Mỗi tài khoản có một CV tổng hợp ngắn, mỗi đợt bắn đồng thời một request/tài khoản qua HTTP loopback, không gọi provider AI/email. Chưa đại diện cho thư viện 20 CV/người, CV 5 trang có ảnh lớn hoặc tải production kéo dài.

| Runtime / tải | List p95 | Save p95 | Hai export worker, thời gian lớn nhất |
|---|---:|---:|---:|
| PHP development server, một worker, 50 tài khoản | 40.558 ms | 48.191 ms | 2.232 ms |
| Apache 64 threads, chưa bật OPcache, 50 tài khoản | 7.130 ms | 5.892 ms | 2.300 ms |
| Apache + OPcache, đợt đầu sau khởi động, 50 tài khoản | 7.532 ms | 1.408 ms | 2.190 ms |
| Apache + OPcache đã ấm, 50 tài khoản | 1.404 ms | 1.176 ms | 2.419 ms |
| Apache + OPcache đã ấm, 10 tài khoản | 324 ms | 310 ms | 2.180 ms |

**Mục tiêu save p95 dưới 500 ms ở 50 người chưa đạt trên máy này.** List đạt mục tiêu 1,5 giây khi cache đã ấm, export ngắn dưới 10 giây với hai worker. Với hai mẫu export, cột export là thời gian lớn nhất quan sát được, không phải một ước lượng p95 đủ tin cậy. Nó bao gồm khởi động PHP/worker và render, không đo thời gian chờ hàng đợi dưới tải kéo dài.

Giữ rollout thử nhỏ trước; dùng Apache/Nginx với PHP phù hợp và OPcache, chạy worker `cv` riêng. Cần đo lại save latency trên máy triển khai trước khi mở rộng lên 50 phiên chỉnh sửa. Số đo hiện tại không chứng minh đủ SLA production; chưa có số đo input latency và query count dưới tải đồng thời.

Probe bổ sung trong runtime test: list 1 hoặc 20 bản nháp dùng 6–7 query (gồm xác thực), save dùng 8 query; PHP peak 28 MiB cho probe gọi HTTP kernel tuần tự. Hai process Node render đồng thời fixture dài có peak RSS 137.468–138.364 KiB (~134–135 MiB/process), runtime 1.439–1.447 ms. Đây là các phép đo riêng, không phải bộ nhớ toàn hệ thống dưới tải 50 người. PHPUnit peak memory 82 MB cũng chỉ là bộ nhớ của tiến trình kiểm thử.

Script tái chạy: `frontend/scripts/benchmark-resumes.mjs` và fixture CLI tương ứng ở backend. Chúng chỉ dùng database E2E disposable và cổng loopback cho phép, tự xóa tài khoản/token/file của lượt đo. Cần có fixture E2E đã migrate và server test đang chạy; **không chạy đồng thời với Playwright đang reset cùng database**.

```powershell
# Terminal riêng, từ repository, chỉ sau khi fixture frontend E2E đã được tạo:
php -S 127.0.0.1:8127 backend/scripts/frontend-e2e-router.php

# Terminal khác:
cd frontend
node scripts/benchmark-resumes.mjs
# Có thể dùng 10 thay vì 50 tài khoản:
$env:RESUME_BENCHMARK_USERS='10'
node scripts/benchmark-resumes.mjs
```

Apache benchmark sử dụng cấu hình riêng ở 127.0.0.1:8137 và PHP ini riêng, không chỉnh XAMPP chính. Nếu chuẩn bị runtime tương đương, đặt `RESUME_BENCHMARK_PORT=8137`; bảo đảm Apache chuyển Authorization header cho PHP. Kết quả JSON nằm trong `frontend/test-results/resume-benchmark/`, không chứa token.

## Điều chỉnh triển khai

- Dùng checkout `feature/cv-builder` mà người dùng đã chọn; giữ nguyên thay đổi riêng ở `docs/demo-data.md`.
- Test renderer dùng ESM `.mts` và artifact CLI đã build để tương thích cách resolve dependency của React PDF.
- Preview canvas thay iframe sau khi QA mobile phát hiện khung trắng. Thêm dependency PDF.js tải theo editor và worker tĩnh cục bộ.
- Xây export backend trước editor để kiểm thử được API/queue độc lập; ba template dùng chung một React PDF document với các bố cục khác nhau.
- Bộ browser thật gộp tạo/xuất/ứng tuyển vào một spec để kiểm tra xuyên suốt bằng cùng một PDF. Autosave tách thành lớp điều phối để kiểm thử thứ tự request độc lập React.
- Không mở flag toàn hệ thống trong đợt này; bước bật, migration additive và worker nằm trong hướng dẫn vận hành. Đặc biệt chưa xác nhận mức tải 50 người đạt đầy đủ mục tiêu.
