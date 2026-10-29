# Chạy trình tạo CV theo mẫu

Chức năng dùng Laravel cho dữ liệu/quyền sở hữu và worker queue `cv` cho xuất PDF. Preview tạo PDF trong Web Worker rồi dùng PDF.js hiển thị từng trang, dùng được cả mobile. Không gọi AI khi chỉnh sửa hoặc xuất CV.

Kết quả kiểm thử và giới hạn tải đã đo: [cv-builder-verification.md](cv-builder-verification.md). Chưa đạt mục tiêu save p95 dưới 500 ms với 50 người dùng trên máy local; nên bật thử với nhóm nhỏ trước.

## 1. Chuẩn bị

- PHP 8.2 trở lên, extension `gd`, `fileinfo`, `mbstring`, `pdo_mysql`, `dom`.
- Node.js 22.13 trở lên (nhánh 22); cùng máy với Laravel worker hoặc môi trường có thể chạy Node artifact.
- Các dependency PHP/Node theo lockfile. Font Be Vietnam Pro TTF và giấy phép OFL đã nằm trong `frontend/public/fonts/resumes/`; không cần tải font ngoài khi render.
- Database queue có `retry_after` lớn hơn timeout job 45 giây; cấu hình Laravel mặc định 90 giây phù hợp. Worker `cv` chạy riêng với `ai` và `emails`.

Với XAMPP, kiểm tra GD:

```powershell
php -m | Select-String gd
```

Nếu chưa có, bỏ dấu `;` ở dòng `extension=gd` trong **php.ini của PHP đang chạy** (`php --ini` để tìm), sau đó khởi động lại API/worker. Không bật hai lần cùng extension. Nếu thiếu GD, upload ảnh CV trả lỗi dịch vụ có kiểm soát; không lưu ảnh thô thay thế.

## 2. Build renderer và frontend

Tại thư mục repository:

```powershell
cd frontend
npm ci
npm run build:cv-renderer
npm run build
cd ..
```

Giữ cả `frontend/dist/cv-renderer/render-cv.mjs`, `frontend/node_modules` chứa dependency production và thư mục font khi deploy. Artifact dùng ESM và resolve dependency từ frontend; không chỉ chép riêng file `.mjs` sang máy trống. `prebuild`/`predev` tự chép PDF.js worker từ dependency đã khóa vào `public/pdf-viewer`; deploy cả public assets theo quy trình Next hiện tại.

Khi thay đổi bố cục template/font/engine trong bản phát hành sau, tăng `renderer_version` ở `backend/config/resumes.php` và rebuild artifact. Export cũ giữ file riêng; version mới ngăn dùng lại bản PDF cũ chỉ vì revision bản nháp chưa đổi.

## 3. Cấu hình backend

Thêm các biến không chứa bí mật vào `backend/.env` trên máy vận hành:

```dotenv
RESUME_BUILDER_ENABLED=true
RESUME_NODE_BINARY=node
# Mặc định renderer_path được resolve từ backend sang ../frontend/dist/cv-renderer/render-cv.mjs.
# Chỉ đặt RESUME_RENDERER_PATH khi bố cục deploy khác; dùng đường dẫn tuyệt đối.
```

Nếu worker không tìm thấy `node` qua PATH, đặt `RESUME_NODE_BINARY` thành đường dẫn tuyệt đối tới `node.exe` trên Windows hoặc binary Node trên Linux. Không đặt dấu nháy shell vào giá trị cấu hình.

```powershell
cd backend
composer install
php artisan config:clear
php artisan migrate
php artisan queue:restart
```

Migration chỉ thêm `resumes`, `resume_assets`, `resume_exports`; không cần reset, import SQL hoặc seed lại dữ liệu đang dùng.

## 4. Chạy hằng ngày

API và frontend chạy theo [hướng dẫn backend](backend-run-guide.md). Mở thêm terminal:

```powershell
cd backend
php artisan queue:work database --queue=cv --sleep=1 --tries=2 --timeout=45
```

Trên Linux dùng process manager để tự khởi động lại worker. Khởi đầu một worker; tăng tối đa hai render đồng thời sau khi đo bộ nhớ/CPU. Timeout Node là 30 giây. Không gộp worker này vào worker chat/email/AI để tránh tác vụ PDF chiếm thời gian xử lý khác.

## 5. Kiểm tra chức năng

1. Đăng nhập candidate → **CV của tôi** → tạo mới → chọn mẫu.
2. Điền nội dung, chờ “Đã lưu”; tải lại trang kiểm tra dữ liệu còn nguyên.
3. “Xuất PDF”, chờ trạng thái sẵn sàng. Chọn **Xem PDF** để mở bản xuất hoặc **Tải PDF** để lưu file về máy; cũng có thể tải bản đã xuất trong thư viện CV. PDF mới tối đa 5 trang và 5 MB.
4. Mở tin đang tuyển → Ứng tuyển → CV tạo trên TimViecOnline → chọn tên và phiên bản PDF.
5. Xem trước đúng bản được chọn rồi xác nhận ứng tuyển. Tài khoản vẫn phải xác nhận email trước khi ứng tuyển.
6. Sửa hoặc xóa bản nháp sau đó; hồ sơ đã nộp vẫn giữ PDF riêng. Employer chỉ được đọc PDF qua đơn thuộc công ty mình; không đọc được bản nháp.

Thư mục file riêng tư:

```text
backend/storage/app/private/resume_assets/    # ảnh CV đã tái mã hóa
backend/storage/app/private/resume_exports/   # PDF theo revision
backend/storage/app/private/application_cvs/  # bản sao riêng của đơn ứng tuyển
```

Không tạo public symlink cho các thư mục này. Link file đi qua API có kiểm tra quyền và proxy Next; không có link CV công khai trong phiên bản này.

## 6. Dọn file và xử lý lỗi

```powershell
php artisan resumes:prune --dry-run
php artisan resumes:prune
```

Lệnh chỉ xét file builder cũ hơn 24 giờ trong các prefix đã định, giữ asset draft/export đang cần và không đụng tới `application_cvs`. Chạy dry-run trước khi lên lịch hằng ngày.

`php artisan resumes:health` trả exit code 1 khi có export pending/processing quá hai phút. Đưa lệnh này vào monitor mỗi phút để phát cảnh báo và kiểm tra worker. Lệnh chỉ đọc trạng thái; không tự dispatch lại. Log render chỉ ghi ID, revision, trạng thái, thời gian và mã lỗi, không ghi nội dung CV.

| Hiện tượng | Kiểm tra |
|---|---|
| Nút tạo/xuất chưa sẵn sàng | Flag backend, cache config và trạng thái đăng nhập candidate |
| Upload ảnh báo dịch vụ chưa sẵn sàng | GD của đúng PHP runtime; khởi động lại process sau cấu hình |
| PDF chờ mãi | Worker queue `cv`, jobs/failed_jobs, đúng database và không dùng worker cũ sau deploy |
| `RENDER_FAILED` | Node executable, artifact đã build, dependency production, font đi cùng artifact, quyền tạo file ở private storage |
| `PDF_PAGE_LIMIT` / `PDF_TOO_LARGE` | Rút gọn nội dung hoặc giảm ảnh/cỡ chữ; không tự cắt bỏ nội dung |
| Có xung đột phiên bản | Giữ phần đang sửa rồi tải bản server hoặc lưu thành CV mới; không ghi đè tự động |
| Bản PDF cũ hơn nội dung | Lưu và xuất lại; mỗi PDF ghi revision riêng, sửa draft không thay PDF đã tạo |

Không sao chép raw stderr/command chứa nội dung CV vào log công khai. Các request đọc/poll export không tự tạo job mới.

## 7. Kiểm thử và rollback

Frontend:

```powershell
npm test
npm run test:cv-renderer
npm run test:cv-preview
npm run lint
npm run typecheck
npm run build
```

`test:cv-renderer` cần backend vendor vì kiểm tra PDF bằng `smalot/pdfparser`; có thể đặt `PHP_BINARY` nếu PHP không ở PATH. `test:cv-preview` cần Chromium của Playwright (`npx playwright install chromium`).

Backend: chỉ chạy PHPUnit trên database test riêng theo [hướng dẫn test](../BACKEND_TESTING_GUIDE.md), với GD và Node renderer đã build. Bộ trình duyệt thật dùng `playwright.backend.config.ts`, database disposable `frontend_api_e2e_test` trên cổng **33063**, không dùng database live. Không chạy script seed E2E trên cấu hình database khác.

Tạm dừng tạo/sửa/xuất mới bằng `RESUME_BUILDER_ENABLED=false`, clear cache và restart worker. API đọc/tải/xóa dữ liệu đã có vẫn dùng được. Không drop các bảng mới hoặc xóa PDF khi rollback code đã có người sử dụng.
