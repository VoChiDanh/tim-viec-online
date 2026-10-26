# Navbar theo thiết kế — 17/10/2026

## Phạm vi đã chốt

Người dùng chọn **ô tìm kiếm trong navbar theo design/page_jobs**, không phải capsule dưới hero trang chủ. Chỉ thay navbar công khai, giữ logo PNG đã cung cấp, header trắng của auth và form tìm kiếm/bộ lọc chính hiện có. `/` tiếp tục chuyển đến `/jobs`; không tạo thêm homepage trong thay đổi này.

## Thiết kế và triển khai

- Đối chiếu trực tiếp `design/page_jobs/index.html`, CSS `filters.css` và ảnh Chromium. Tham khảo navbar chung của homepage nhưng dùng biến thể jobs có tìm kiếm.
- Navbar navy #002B7F, border #002060, chiều cao 69px gồm viền; inner tối đa 1360px. Root của thiết kế dùng font-size 90%, nên quy đổi rem sang px riêng trong header thay vì đổi kích thước toàn ứng dụng: padding desktop 21.6px, icon/nút tròn 28.8px, pill cao khoảng 30.8px, gap 10.8px. Giữ Be Vietnam Pro, thêm weight 900 cho wordmark theo mẫu.
- Capsule tìm kiếm desktop 580 × 36px ở 1440px: từ khóa, divider, MapPin, select địa điểm, nút cam #FF6A39. Gửi GET `keyword`/`city` với giá trị thành phố thật, không dùng các token hcm/hn của HTML prototype. Label ẩn giữ accessible name; chọn địa điểm không bị min-height 48px của select toàn trang.
- Từ 1100px trở xuống, ẩn search navbar và pill nhà tuyển dụng theo CSS mẫu. Dưới 640px, danh mục chỉ giữ icon, ẩn Vi, giảm gap; menu một cột. Ô tìm kiếm chính vẫn hiện trên mobile.
- Cụm phải giữ thứ tự: danh mục, nhà tuyển dụng, Vi, chuông, tài khoản. Dùng Popover/DropdownMenu/Sheet từ registry shadcn Radix hiện có, không thêm dependency mới. Vi là chỉ báo ngôn ngữ, không giả chức năng chuyển ngôn ngữ.
- Menu danh mục neo vào navbar, rộng 1160px trên desktop, max 96vw trên mobile, bốn nhóm theo mẫu. Giữ link điều hướng đang có; các trang chưa triển khai phản hồi chưa khả dụng thay vì dẫn đến 404.
- Tài khoản lấy từ getCurrentUser trên server. Không sao chép tên/email mẫu hoặc badge 2 thông báo trong HTML. Guest nhận lối đăng nhập/đăng ký; người đã đăng nhập có menu theo role. Thông báo chưa tích hợp backend chỉ hiển thị trạng thái tương ứng.
- Trong lúc xác minh phiên, các nút mở overlay tạm disabled; tránh thao tác trên fallback rồi menu bị thay thế khi stream hoàn tất. Logout gọi Server Action qua form nằm ngoài dropdown để form không biến mất khi menu đóng; giữ Origin/cookie/revocation hiện có.
- Bỏ component mobile navigation và các style navbar cũ không còn dùng. Không sửa backend, database, .env hoặc dữ liệu việc làm.

## Kiểm chứng

Build production, lint, TypeScript và git diff --check. Kiểm tra browser gồm tìm keyword + city từ navbar, reset page, Escape/click ngoài/trả focus, lọc từ link IT Jobs, account guest, Sheet thông báo, axe khi mở menu và responsive 360/390/768/1024/1440px.

Suite preview/public có 21 tình huống: lần đầu 20 đạt, phát hiện neo menu sai; đã sửa và chạy lại nhóm navbar/responsive. Suite API fixture có 15 tình huống: 14 đạt ban đầu, kịch bản logout được chạy lại sau khi sửa trạng thái chờ phiên và đạt, bao gồm thu hồi token. Các lần chạy lại tập trung vào phần thay đổi; chưa kiểm thử với Laravel thật, Safari/Firefox hoặc trình đọc màn hình thực tế.

Ảnh đối chiếu HTML và frontend tại `frontend/playwright-report/navbar/` (gitignored). Đã đo header 69px, search 580 × 36px, menu desktop x140/y76/rộng1160 tại viewport1440. Logo thật và nội dung theo phiên là khác biệt có chủ ý so với dữ liệu giả trong mẫu. Không tuyên bố toàn bộ trang giống thiết kế hoặc backend đã tích hợp.

## Cập nhật theo yêu cầu ngày 18/10/2026

Người dùng yêu cầu bỏ hàng tìm kiếm lặp ở nội dung `/jobs`, giữ tìm từ khóa/địa điểm trên navbar và chỉ để bộ lọc bên dưới. Quyết định này thay thế phần giữ form tìm kiếm chính và ẩn tìm kiếm navbar trên mobile ở phạm vi ban đầu.

- Giữ phong cách và màu hiện tại của `design/page_jobs`: navbar navy, ô tìm kiếm trắng, bộ lọc viền mảnh. Bỏ hàng từ khóa/địa điểm/nút tìm kiếm thứ hai, đường chia và hướng dẫn nhấn nút. Khung dưới chỉ còn ngành nghề nhiều lựa chọn, hình thức làm việc, lương, cấp bậc và xóa bộ lọc.
- Bộ lọc áp dụng ngay, giữ từ khóa/địa điểm, đưa phân trang về trang đầu. React optimistic state giữ dropdown ngành nghề mở khi chọn liên tiếp; quay lại/tải lại khôi phục tiêu chí từ URL. Ô tìm ngành nghề chỉ thu hẹp danh mục lựa chọn.
- Navbar đọc từ khóa/địa điểm từ URL và lấy danh sách địa điểm qua cùng `getJobCatalog` đang phục vụ trang việc làm. `next/form` điều hướng phía client, giữ bộ lọc khi tìm tiếp trên `/jobs`, đồng thời hỗ trợ GET khi JavaScript chưa sẵn sàng.
- Dưới 1100px, cùng form navbar chuyển xuống hàng hai để tiếp tục tìm được trên mobile. Menu danh mục neo theo toàn bộ chiều cao navbar; giữ lối Escape và trả focus. Skeleton bộ lọc đổi theo chiều cao mới.
- Giả định: giữ nguồn dữ liệu và giới hạn hiệu năng hiện tại; thay đổi không thêm dependency, API, thông tin cá nhân hay yêu cầu backend. So với giữ nút áp dụng riêng, áp dụng ngay phù hợp tương tác trong mẫu và tránh thêm nút tìm kiếm thứ hai.

Kiểm chứng: build production, ESLint, TypeScript; browser Chromium kiểm tra tìm kiếm không dấu, quay lại/tải lại, phối hợp nhiều ngành/hình thức/lương, giữ keyword/city, xóa tiêu chí, tìm trên mobile, menu/focus, axe và chống tràn ngang ở 360/390/768/1024/1440px. Chưa kiểm tra Safari/Firefox hoặc API Laravel thật.
