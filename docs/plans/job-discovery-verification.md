# Kiểm chứng mốc tìm kiếm việc làm

Ngày kiểm tra: 17/10/2026. Nhánh `feature/job-discovery-fe` tạo từ `develop`, giữ lịch sử design hiện có. Code đã chuyển về thư mục dự án chính `F:/Soure_Code/tim-viec-online` theo yêu cầu của người dùng; tiếp tục làm việc trực tiếp trên branch, không cần dùng worktree riêng.

## Kết quả

- `npm run lint`: đạt.
- `npm run typecheck`: đạt, dùng route type generation của Next 16.4.
- `npm test`: 12 kiểm thử đạt; gồm quy tắc lương SRS, tìm không dấu/Đ, tổ hợp bộ lọc, query lỗi, phân trang, thời gian Việt Nam, fixture và chống chuyển hướng ra ngoài tại điểm nối login.
- `npm run build`: đạt với Cache Components và Partial Prefetching. Các trang dữ liệu động dùng Suspense/runtime boundary.
- Playwright production server: 11 kiểm thử đạt; tìm → lọc → phân trang → chi tiết → yêu cầu đăng nhập; back/refresh giữ URL; tin đóng/hết hạn khóa ứng tuyển; not-found có main landmark. Dialog hỗ trợ Escape, Enter và trả focus.
- Responsive 360, 390, 768, 1024, 1440px: danh sách và chi tiết không tràn ngang quá 1px. Đã xem ảnh desktop 1440px và mobile 360px; giữ nhận diện navy, card trắng, font và footer.
- Axe WCAG 2 A/AA và 2.1 AA: không có vi phạm được phát hiện trên danh sách, chi tiết, not-found, điểm nối đăng nhập và dialog lưu việc. Màu cam của CTA/chữ lương được điều chỉnh thành `#c2410c` sau khi kiểm tra phát hiện tỷ lệ tương phản thấp ở màu cũ. Bộ lọc có label riêng để tránh tên truy cập chứa toàn bộ option.
- `npm audit --omit=dev`: 0 lỗ hổng; shadcn CLI chuyển sang devDependencies, Base UI được gỡ. Audit toàn bộ còn 9 cảnh báo high trong chuỗi công cụ phát triển liên quan [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), chưa có bản vá khi kiểm tra. Không áp dụng downgrade không tương thích do npm gợi ý.
- Font Be Vietnam Pro theo nhận diện có [SIL OFL 1.1](https://github.com/google/fonts/blob/main/ofl/bevietnampro/OFL.txt); bản giấy phép giữ tại `frontend/public/licenses/BeVietnamPro-OFL.txt`.

## Giới hạn

Chưa có backend nên chưa kiểm tra xác thực/authorization, dữ liệu MySQL, API lỗi thực tế, upload CV, lưu việc thật hoặc ứng tuyển. Error boundary/skeleton có triển khai; chưa mô phỏng backend timeout để nghiệm thu toàn bộ vòng đời mạng. Chưa đo SLA 50 người, uptime, AI và WebSocket. Chưa kiểm thử Safari/Firefox hoặc trình đọc màn hình thực tế; axe không thay thế kiểm tra thủ công các công nghệ hỗ trợ.

Các thay đổi riêng của người dùng ở `docs/SRS.md` và `design/index.html` được giữ nguyên, nằm ngoài commit frontend. Phần frontend được lưu riêng trên nhánh `feature/job-discovery-fe`; chưa push.
