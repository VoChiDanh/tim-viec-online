# Đồng bộ admin với sản phẩm — 23/10/2026

Người dùng đã merge PR #4 vào `feature/admin-integration` và yêu cầu chỉnh phần admin theo thiết kế đã thống nhất. Giữ phạm vi SRS FR-09 và thiết kế `docs/design/admin-pages.md`: tổng quan, tin bị báo cáo/chi tiết/xóa, tài khoản/khóa/mở khóa, CRUD ngành nghề và kỹ năng. Không thêm trạng thái tin chờ duyệt, phân tích AI cho ứng viên hay backend mới.

## Quyết định triển khai

- Dùng lại thiết kế quản trị tối giản của khu vực employer: logo thật, Be Vietnam Pro, navy/xanh thương hiệu, nền slate, badge pastel, khoảng cách theo nhịp 4/8px. Tăng khả năng đọc các nhãn và bảng, sidebar cố định kích thước, mobile dùng Sheet.
- Layout chung giữ shell và provider khi đổi trang. Mỗi trang vẫn kiểm tra vai trò ở server. Các URL preview cũ chuyển về trang chuẩn sau khi xác thực; tham số preview không có quyền bỏ qua kiểm tra.
- Dữ liệu minh họa chỉ được cấp trong `AUTH_MODE=mock`. API mode hiện chưa có hợp đồng admin nên hiển thị trạng thái chưa kết nối, không dựng dữ liệu giả hoặc thao tác giả lên tài khoản thật. Tích hợp API sẽ thực hiện tại lớp service, giữ component trình bày.
- Dùng một provider trong bộ nhớ cho toàn khu vực: danh sách, dashboard và số tin báo cáo cập nhật cùng dữ liệu. Không lưu thông tin cá nhân vào localStorage. Reload/đăng xuất khôi phục fixture, có nút khôi phục mẫu rõ ràng. Khóa tài khoản mẫu không tuyên bố đã thu hồi phiên đăng nhập thật.
- Ô lọc tái sử dụng Popover một lựa chọn không khóa cuộn. Phân trang dùng cửa sổ tối đa bốn số của `paginationPages`. Toast dùng Sonner đã có; hộp thoại dùng Radix, nhãn lỗi và focus theo component chung.
- Xóa ngành nghề đang dùng bị chặn theo FK; xóa kỹ năng cảnh báo gỡ liên kết. Xóa tin yêu cầu lý do và xác nhận ảnh hưởng, tách khỏi khóa chủ tin.

## Kiểm chứng dự kiến

Build, TypeScript, lint; unit test quy tắc hiện có; E2E quyền truy cập/preview/deep link, điều hướng shell, CRUD liên trang, xóa tin cập nhật số liệu, khóa/mở khóa mẫu, tìm không dấu, bộ lọc/phân trang, bàn phím/axe và bố cục 360/1440px. Đây là kiểm chứng frontend mock, không chứng minh chỉ tiêu tải đồng thời, uptime hoặc phân quyền Laravel.

## Tài khoản và tích hợp dữ liệu

Trong `AUTH_MODE=mock`, đăng nhập `admin@example.test` / `Admin@123`, sau đó truy cập `/admin`. Đây là tài khoản demo công khai đã được PR cung cấp; thông tin xác thực và phiên được kiểm tra ở server. Việc tạo tài khoản admin không được đưa vào đăng ký công khai.

`admin/layout.tsx` là điểm cấp dữ liệu và shell; `_components/admin-content.tsx` là kiểm tra quyền tại từng trang. `AdminProvider` giữ trạng thái theo phiên điều hướng và user ID, không ghi localStorage. Hiện chưa có API admin trong hợp đồng backend; API mode hiển thị “Dữ liệu quản trị chưa được kết nối”. Khi bổ sung API, thay factory ở server bằng service có token/phân quyền và chuyển thao tác dữ liệu sang các mutation được backend kiểm tra. Không coi mock `setDb` là lớp bảo mật.

Sau đợt rà soát khả năng thay mock/backend, component không còn nhận `setDb`: đọc qua `services/admin.ts`, ghi qua `AdminCommand`/adapter bất đồng bộ, fixture chuyển sang `mocks/admin.ts`. Chi tiết trách nhiệm SRS/SQL và các bước nối API thật trong [admin backend handoff](admin-backend-handoff.md). Các đoạn `getInitialDatabase`/mock `setDb` phía trên mô tả thiết kế ban đầu, không phải điểm tích hợp hiện tại.

Hộp thoại dùng wrapper `AdminDialogContent` để cuộn nội dung ở màn hình thấp, khôi phục focus về nút mở hoặc tiêu đề nếu bản ghi bị xóa; các trang đóng portal khi Next Activity ẩn trang. ID form có prefix để không trùng giữa các route được giữ trong bộ nhớ.

## Bản vá framework

Build phát hiện Next.js 16.4.0 thuộc dải phiên bản có cảnh báo bảo mật; nâng `next` và `eslint-config-next` lên 16.4.2 và cập nhật lockfile, không đổi major. Nguồn: [Image Optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r). `npm audit --omit=dev` sau cập nhật báo 0 lỗ hổng; không áp dụng `audit fix --force` hay đổi dependency không liên quan.

## Kết quả kiểm chứng

- Build production/TypeScript và ESLint đạt; 69 unit test, 8 kiểm tra server mock-auth đạt.
- Lượt E2E chính: 41/41 đạt cho admin, account layout, navbar, bộ lọc và scrollbar. Sau khi hoàn thiện wrapper dialog, chạy lại 11/11 E2E admin đạt, có thêm ca 360×640 kiểm tra giới hạn chiều cao, cuộn tới nút xác nhận, Escape và trả focus. Tổng cộng 42 kịch bản mock khác nhau đã được kiểm tra.
- 18/18 E2E chế độ API đạt, bao gồm không lộ fixture qua canonical/preview/query admin, role từ server, session, logout, CSRF, đổi mật khẩu và form xác thực.
- Axe tự động ở 5 trang danh sách/tổng quan × 360/1440px và dialog danh mục đạt. Đã xem ảnh desktop tổng quan/kiểm duyệt và mobile tài khoản. Không tràn ngang trang quá 1px, header/sidebar giữ node khi chuyển trang; thay đổi dữ liệu liên trang được kiểm tra thực tế.
- Chưa kiểm tra trình đọc màn hình thật, Firefox/Safari, API quản trị Laravel thật hoặc tác vụ thu hồi phiên/gửi thông báo thật. Fixture chỉ giữ trong bộ nhớ cho tới reload/đăng xuất.

## Đồng bộ UI và chuyển động với sản phẩm

Sau phản hồi giao diện còn lệch với ứng viên/employer, tiếp tục giữ hướng quản trị tối giản nhưng đối chiếu trực tiếp thông số đang dùng ở employer: sidebar 224px/container 1600px, trạng thái nav nền nhạt không viền trái, tiêu đề 25px/700, panel bo 14px, nút 44px/bo 9px/600, primary cam và secondary navy. Tab dùng gạch chân, giảm độ nổi của ghi chú mock. Giữ chữ đủ đọc và màu trạng thái nghiệp vụ.

Phân trang admin dùng trực tiếp `Pagination` chung với hai chế độ URL và callback; input/textarea dùng primitive có sẵn, footer hộp thoại và kích thước title thống nhất. Không thêm dependency hoặc đổi logic quản trị.

Chuyển trang dùng `AdminPageEntrance` tại từng leaf đã xác thực: opacity 0.65 → 1, tiêu đề dịch lên 6px, 240ms/easing từ `motion.css`. Layout, provider, form và bộ lọc không bị remount; Activity khôi phục trang sẽ chạy lại hiệu ứng. Không animate chiều rộng/chiều cao, không transform ancestor của sticky/portal, không trì hoãn hiển thị nội dung. Hủy animation khi trang bị ẩn hoặc bật reduced motion; popup/dialog/sheet tiếp tục dùng animation mở/đóng chung của Radix. Hover và press dùng token chung 120ms.

Kiểm chứng bổ sung: so sánh thông số phân trang public/admin tại 360/1440px; chuyển qua lại giữ node sidebar/header và giá trị tìm kiếm; xác nhận effect chạy khi mở/quay lại trang, không chạy lại khi gõ; reduced motion giữ focus dialog. Chạy lại các luồng CRUD/quyền truy cập và kiểm tra ảnh/axe trên mobile/desktop.

Kết quả đợt đồng bộ: production build/TypeScript, lint và 69 unit test đạt; 24 E2E đạt cho UI/motion admin, CRUD, auth, navbar và bộ lọc chung. Thời lượng WAAPI được chuyển đổi cả đơn vị `ms` và `s` vì CSS production có thể rút `240ms` thành `.24s`; kiểm tra browser xác nhận đúng 240ms và easing chung. So sánh phân trang public/admin khớp height/min-width/radius/background/color tại 360/1440px. Đã xem ảnh kiểm duyệt desktop và tài khoản mobile sau khi thu gọn ghi chú mock; axe và focus/reduced-motion đạt trong phạm vi tự động. Chưa kiểm thử cảm nhận chuyển động với người dùng thật hoặc trình đọc màn hình.
