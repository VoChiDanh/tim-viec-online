# TimViecOnline frontend

Next.js 16.4 App Router, React 19, TypeScript, Tailwind 4, shadcn/Radix, Lucide và Sonner. Hiện có tìm kiếm/chi tiết việc làm và frontend xác thực. Việc làm dùng dữ liệu minh họa; Laravel hiện chưa có API xác thực đầy đủ.

## Chạy cục bộ

Yêu cầu Node.js 22 và npm. Từ thư mục `frontend`:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Mở `http://localhost:3000/jobs`. `/` chuyển đến `/jobs` trong mốc này. Không cần MySQL, Laravel hoặc Gemini để chạy bản trải nghiệm.

## Những gì đã hoạt động

- Tìm có dấu/không dấu theo tiêu đề, công ty và kỹ năng.
- Lọc nhiều ngành, tỉnh/thành, hình thức, cấp bậc và mức lương; các nhóm kết hợp AND. URL giữ bộ lọc khi refresh, chia sẻ và back/forward.
- 18 tin đang tuyển, phân trang thật 6 tin/trang. Sắp xếp cập nhật mới nhất, ID giảm dần khi trùng thời gian.
- Chi tiết theo ID, thông tin công ty, kỹ năng và việc tương tự. `/jobs/19` minh họa tin đóng; `/jobs/20` minh họa tin hết hạn; cả hai khóa ứng tuyển.
- Khách lưu/ứng tuyển được yêu cầu đăng nhập. Có `/login`, `/register`, `/forgot-password`, `/reset-password` với validation SRS, hiện/ẩn mật khẩu, lỗi cạnh trường và giữ thông tin khi trùng email.
- Skeleton, không có kết quả/xóa lọc, error boundary/thử lại và not-found.

## Dữ liệu và tích hợp

`src/features/jobs` chứa type, quy tắc lọc, parse URL và định dạng thuần. `src/mocks/jobs.ts` tạo fixture theo ngày Việt Nam. `src/services/jobs.ts` là lớp server-only cung cấp `listJobs`, `getJob`, `getJobCatalog`, `findRelatedJobs`; component không import fixture. Snapshot được dùng chung trong từng request bằng React cache.

Các khóa URL: `keyword`, `category_ids` (lặp lại được), `city`, `job_type`, `salary`, `level`, `page`. Salary nhận `under10`, `10to20`, `over20`, `negotiable`. Quy tắc so sánh theo SRS FR-05.3; `salary_max=null` không thuộc nhóm phải so sánh max. Tin active còn hạn mới vào kết quả; hạn tính hết ngày theo Asia/Ho_Chi_Minh.

Khi backend sẵn sàng, thay implementation repository bằng API adapter sau khi thống nhất DTO/envelope, multi-category, phân trang, ngày hạn và sort. Các biến API/Reverb trong `.env.example` chuẩn bị cho mốc sau; hiện repository chưa sử dụng chúng. Frontend không truy cập database, không chứa secret, không thay authorization backend.

## Xác thực

Mặc định `AUTH_MODE=preview`: các form kiểm tra dữ liệu; với JavaScript hoạt động, submit hợp lệ không gửi mật khẩu qua mạng và báo chưa thể thực hiện yêu cầu. Không tạo phiên, tài khoản hoặc giả gửi email. Các action server cũng kiểm tra dữ liệu và từ chối tạo phiên khi đang preview. Không đưa ghi chú về tiến độ phát triển lên form.

Logo do người dùng cung cấp nằm tại `public/brand/logo.png`, dùng chung qua component `Brand` ở header/footer và cấu hình biểu tượng tab trong root metadata. `next/image` giữ tỷ lệ và tối ưu kích thước ảnh khi hiển thị.

Panel cạnh form có liên kết ngành nghề và đăng ký nhà tuyển dụng; ẩn trên mobile để ưu tiên nhập liệu. Focus ô nhập dùng border mảnh và halo nhẹ, giữ trạng thái lỗi và hỗ trợ forced-colors. [Đối chiếu code và API Laravel hiện tại](../docs/plans/laravel-frontend-integration.md).

Navbar công khai theo `design/page_jobs`: tìm nhanh từ khóa/địa điểm, mega menu, menu tài khoản và panel thông báo. Xem [phạm vi và kiểm chứng navbar](../docs/plans/navbar-frontend.md). Form tìm kiếm/bộ lọc chính và header trắng auth giữ nguyên.

Chỉ bật API sau khi nhóm backend thống nhất hợp đồng:

```dotenv
AUTH_MODE=api
AUTH_API_URL=http://localhost:8000/api
AUTH_APP_URL=http://localhost:3000
```

Đây là adapter BFF token đề xuất theo README: Server Actions gọi API Laravel, xác minh token qua `/user`, lưu token trong cookie HttpOnly/Secure/SameSite và không serialize vào client. Production phải dùng HTTPS ngoài loopback. `/employer`, `/admin` là điểm đến được kiểm tra role; `/account/security` dùng đổi mật khẩu. Những trang này chưa có nghiệp vụ portal đầy đủ. Backend vẫn cần authorization và enforcement token expiry/revocation, rate limit, unique email, khóa tài khoản và reset token dùng một lần trong 15 phút. Cookie maxAge không thay thế hạn token phía backend. Sanctum SPA cookie/session là phương án first-party chính thức và có thể thay adapter khi nhóm chọn cơ chế đó.

Adapter yêu cầu response `{success:true,data:...}` theo AGENTS; `/login` trả `data.token` hoặc `data.access_token`, nên kèm `data.expires_at`; `/user` trả `data` gồm id/name/email/role/status. Các route POST register/login/logout/forgot-password/reset-password và PUT user/change-password theo README. Backend hiện chỉ có `/user` scaffold trả raw model, nên chưa đáp ứng hợp đồng này. [Quyết định và giới hạn auth](../docs/plans/auth-frontend.md).

## Kiểm tra

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:auth
npm audit --omit=dev
```

Playwright preview tự chạy production server cổng 3117; cần build trước. `test:auth` chạy riêng frontend 3119 với HTTP fixture 4119 chỉ dùng cho kiểm thử, không phải backend của ứng dụng. Hai suite chạy lần lượt. Kiểm tra URL/history, role/cookie/origin, lỗi form, responsive 360–1440px và axe WCAG A/AA. Ảnh/traces ở `test-results/` được gitignore. Chưa chứng minh SLA 50 người, uptime hoặc tích hợp Laravel thật; chưa kiểm tra Safari/Firefox hay trình đọc màn hình thực tế.

`npm audit --omit=dev` hiện không báo lỗ hổng. Audit toàn bộ báo chuỗi dependency phát triển của ESLint/shadcn liên quan [braces GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); chưa có bản vá khi kiểm tra. Không dùng `npm audit fix --force` để hạ Next/shadcn không tương thích. CLI shadcn nằm trong devDependencies và Base UI đã được gỡ.

## Quy tắc làm việc

Tạo `feature/*` từ `develop`, kiểm tra rồi tạo PR theo README gốc. Làm trực tiếp trong thư mục dự án trên branch theo yêu cầu người dùng. Không commit `.env.local`, `.next`, `node_modules` hoặc kết quả kiểm thử. [Kế hoạch tìm việc](../docs/plans/job-discovery-frontend.md). AI, chat, hồ sơ, employer portal và tích hợp backend thật thuộc các mốc tiếp theo.
