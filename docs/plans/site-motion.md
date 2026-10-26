# Chuyển động giao diện — 18/10/2026

Người dùng yêu cầu đồng bộ animation toàn bộ trang theo cảm giác dropdown việc làm đã được chấp nhận: nhanh, nhẹ và gọn. Giữ bố cục, màu thương hiệu và nghiệp vụ.

- Menu dropdown/popover/danh mục/tài khoản: mở 160ms, đóng 100ms, dịch 4px theo phía neo và scale 0.98. Dùng cùng nhịp để không có menu nhanh/chậm khác nhau.
- Dialog: hiện 240ms, dịch 6px và scale nhẹ; overlay mờ dần. Panel thông báo: hiện 240ms, dịch 24px đúng hướng, đóng 120ms. Giữ Radix Presence quản lý đóng, focus và portal.
- Nội dung trang, form auth, chi tiết và trạng thái rỗng: hiện 240ms, dịch 6px, opacity bắt đầu 0.65 để không giấu nội dung. Danh sách việc làm xuất hiện lệch nhau tối đa 72ms. Header/footer giữ vị trí ổn định; link/nút/ô nhập có transition màu, viền và focus 120ms.
- Hover card chỉ nâng 2px trên chuột chính xác; nút nhấn scale 0.98, mũi tên dropdown xoay. Giả định: giữ cảm giác chuyên nghiệp của giao diện hiện có; không thêm hoạt ảnh cuộn hoặc chặn điều hướng để chạy animation.
- Chọn CSS dùng chung `motion.css` thay vì thêm thư viện JavaScript hoặc remount route/form. Chỉ animate transform/opacity khi nội dung xuất hiện; không animate chiều cao/chiều rộng. Giá trị thời gian/easing tập trung qua CSS variables. Không thêm API, dependency hoặc xử lý dữ liệu người dùng.
- `prefers-reduced-motion: reduce` bỏ độ trễ, lặp và chuyển động kéo dài; không đổi transform phục vụ định vị dialog. Không ẩn nội dung nếu animation bị vô hiệu hóa.
- Kiểm tra menu mở/đóng và focus, dialog ở giữa màn hình, sheet, form auth và lỗi, chuyển trang/tìm kiếm, menu ở 360px, reduced motion và giao diện đang chạy trên cổng 3000. Không xem ảnh tĩnh là bằng chứng đủ cho animation.

## Kiểm chứng

Build production, ESLint và TypeScript đạt; 26 kịch bản Chromium đạt gồm auth preview, jobs/navbar/bộ lọc, hai chế độ chuyển động, focus và responsive 360–1440px. Đã kiểm tra animation đang chạy trên cổng 3000 bằng Web Animations API: menu mở 160ms; reduced motion đưa thời lượng về 0.01ms và nội dung giữ opacity 1. Đã xem ảnh trang đăng nhập và chi tiết sau khi hoàn tất chuyển động.

Tắt transition mặc định trên các bề mặt overlay để tránh transition `transform-origin` của utility cũ chạy đồng thời với animation mới. Khi thoát, Radix vẫn chờ animation hoàn tất rồi trả focus. Chưa đo FPS trên thiết bị yếu, kiểm tra Safari/Firefox hoặc trình đọc màn hình thật.
