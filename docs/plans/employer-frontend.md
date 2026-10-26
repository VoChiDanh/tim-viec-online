# Không gian nhà tuyển dụng

Nguồn nghiệp vụ: `docs/SRS.md` (FR-04, FR-06, FR-07, FR-08), cấu trúc `db/tim_viec_online.sql`. Tham chiếu giao diện: `design/page_employer_dashboard`, `page_employer_profile`, `page_post_job`, `page_employer_candidates`, `page_employer_chat`, `page_employer_notifications` và `design/shared/employer*`.

## Phạm vi và các quyết định

- Dùng header trắng, sidebar 224px và bố cục navy/xanh của thiết kế. Logo, font, dropdown, lịch, hộp thoại và phân trang tái sử dụng hệ thống frontend; phân trang luôn dùng component chung, tối đa bốn số trang.
- Các route: `/employer`, `/employer/jobs`, `/employer/jobs/new`, `/employer/jobs/:id/edit`, `/employer/company`, `/employer/candidates`, `/employer/candidates/:id`, `/employer/messages`, `/employer/notifications`.
- Layout giữ provider, header và sidebar qua điều hướng. Mọi trang con vẫn gọi `requireUser("employer", returnTo)` trong server boundary. Đăng nhập giữ query của liên kết hồ sơ/hội thoại; candidate không thể truy cập dữ liệu employer.
- Tiếp tục dùng hai tài khoản mock đã có. Dữ liệu công ty/các tin/hồ sơ/hội thoại thuộc một employer; không lấy toàn bộ danh sách việc làm công khai làm dữ liệu riêng của doanh nghiệp.
- Thao tác hiện chạy trong bộ nhớ phiên xem trước, không LocalStorage, không giả lập backend thành công. Tải lại trang khôi phục dữ liệu mẫu. AI là kết quả mẫu; PDF demo công khai chỉ chứa dữ liệu hư cấu. Không gửi tin nhắn thực hoặc tuyên bố có WebSocket.
- Chế độ API không tự thay dữ liệu lỗi bằng mock. Hiển thị trạng thái chưa kết nối khi adapter employer chưa được triển khai.

## Ràng buộc theo SRS và SQL

- Công ty cần tên, giới thiệu, địa chỉ và tỉnh/thành trước khi đăng tin. `name` tối đa 200, `company_size` 50, `city` 100, `website/address` 255 ký tự. Logo kiểm tra nội dung ảnh, tối đa 2 MB theo control dùng chung.
- Tiêu đề tin 10–200 ký tự; ngành nghề, cấp bậc, số lượng nguyên dương, thành phố, địa chỉ, mô tả/yêu cầu/quyền lợi phải có. Ngày hạn nộp từ ngày mai, chọn bằng lịch tùy chỉnh. Tỉnh/thành dùng catalog API hiện tại.
- Lương: `range` yêu cầu hai số nguyên dương và min <= max; `starting` chỉ giữ min; `negotiable` đặt hai mức null. DTO chuẩn dùng `is_negotiable`, không gửi `salary_mode` lên SQL.
- Tin mới `active`; không có trạng thái nháp/chờ duyệt. Đóng/mở giữ hồ sơ và hội thoại. Tin quá hạn cần sửa hạn trong tương lai trước khi mở lại. Employer không có nút xóa tin.
- Hồ sơ dùng `applied`, `waiting`, `accepted`, `rejected`, `withdrawn`. Xem PDF thật lần đầu chuyển applied sang waiting và chỉ đặt reviewed_at một lần. Hồ sơ withdrawn không được duyệt hoặc mở hội thoại mới.
- Hội thoại chỉ xuất phát từ đơn ứng tuyển có sẵn. `applications.candidate_id` là profile ID; `conversations.candidate_id` là user ID. Chat 1–1.000 ký tự sau trim, hỗ trợ IME, giữ draft riêng từng phòng và tiếp tục khi tin đóng.

## Điểm nối backend

- DTO: `frontend/src/features/employer/types.ts`; quy tắc thuần: `rules.ts`.
- Read seam server: `frontend/src/services/employer.ts`. Thay nguồn `createEmployerData` bằng adapter Laravel khi hợp đồng endpoint sẵn sàng; giữ role/owner check tại DAL và backend.
- Tách mutation khỏi các phương thức preview trong `EmployerProvider` thành server actions/API adapter: company PUT, job POST/PUT, job status PATCH, application review/status PATCH, conversations POST, messages POST, notifications read PATCH. Mọi mutation phải xác minh phiên, CSRF/origin và quyền sở hữu ở backend; state client không phải authorization.
- Giữ các field SQL: `company_size`, `address`, `job_level`, `is_negotiable`, `reviewed_at`, `read_at`; không đưa interview/draft hoặc thông tin riêng của form thành enum/database field.
- PDF thực cần endpoint tải/xem có kiểm tra quyền, không public storage URL cho hồ sơ riêng. Khi thay mẫu phải thay allowlist `/demo/employer-cv.pdf` bằng URL nội bộ đã xác thực; không render URL tùy ý từ input.
- WebSocket và Gemini là phần backend/integration riêng. Khi kết nối cần đồng bộ loading, lỗi, retry và chống gửi trùng; không bỏ qua lỗi mạng bằng dữ liệu mẫu.

## Kiểm tra

Build/type check, lint; unit tests ràng buộc công ty/lương/ngày/trạng thái/return path. Playwright kiểm tra guards, deep link, tính bền layout, tạo/sửa/đóng/mở tin, PDF/review, chat, thông báo và responsive/accessibility ở 360/768/1440px. Chụp và xem giao diện thực so với các trang design trước khi hoàn tất.

Kết quả kiểm chứng: build và lint đạt; 54 unit test, 8 server mock-auth test, 25 E2E cho employer/navbar/account layout và 17 E2E xác thực qua API fixture đạt. Đã kiểm tra thêm 7 luồng xác thực mock trên trình duyệt. PDF demo được giữ dạng binary trong Git để tránh đổi CRLF làm sai byte offset.

Tinh chỉnh UX: `SelectionField clearable={false}` dùng cho lựa chọn bắt buộc và sắp xếp, không tạo lựa chọn placeholder trùng với giá trị thật hoặc nút xóa. Bộ lọc vẫn giữ khả năng xóa độc lập. Trạng thái xét duyệt hiển thị giá trị thực, chỉ lưu khi xác nhận. Nút đọc tất cả nằm ngay đầu khung thông báo, cập nhật số chưa đọc và phản hồi kết quả; các ô số lượng/lương giữ phần đơn vị riêng trong layout. Build, lint và 23 E2E employer/selection/sorting đã qua sau thay đổi.

## Hoàn thiện ngữ cảnh tuyển dụng và cách hiển thị

- Mỗi dòng hồ sơ luôn hiển thị tên tin đã ứng tuyển, mã tin và mã đơn, phân biệt với chức danh cá nhân. Chi tiết hồ sơ và phần AI nhắc rõ tin đối chiếu; có liên kết lọc hồ sơ cùng tin và chỉnh sửa đúng tin thuộc employer. Không mở nhầm dữ liệu việc làm công khai từ ID mẫu trùng nhau.
- Bộ lọc trên mobile có thể thu gọn để ưu tiên danh sách; desktop giữ bộ lọc mở. Phân trang dùng component chung. Tin đóng/hết hạn vẫn giữ hồ sơ, CV và hội thoại; chỉ ngăn mở hội thoại mới cho đơn đã rút, hội thoại cũ vẫn được giữ.
- Dashboard ưu tiên tác vụ thật (hồ sơ chưa xem, thông báo chưa đọc, tiến độ bốn trường công ty) và ngữ cảnh tin trên hồ sơ nổi bật, loại bỏ điểm 88% trang trí. Danh sách tin phân biệt tổng hồ sơ và hồ sơ chưa xem, dùng hành động có nhãn.
- Form công ty có tiến độ, trạng thái chưa lưu và ID riêng; form sửa tin có mã/tiêu đề/trạng thái, bộ đếm nội dung và xem trước cách hiển thị lương. Lịch giới hạn theo chiều cao còn lại để thao tác được ở gần mép màn hình.
- Tin nhắn và thông báo hiển thị tin/mã hồ sơ tương ứng. Thông báo thứ tư đã có hội thoại/tin nhắn mẫu đúng ứng viên; chuông hiển thị số chưa đọc. Giữ phân biệt đã đọc/chưa đọc và thao tác đọc tất cả.
- Tăng độ rõ chữ, kích thước vùng bấm và bố cục mobile trên toàn bộ employer, giữ màu/font/layout chung. Không thay đổi enum nghiệp vụ hoặc bổ sung backend, AI hay WebSocket thật.

Kiểm chứng đợt hoàn thiện: build/typecheck, lint, 56 unit test và 20 E2E employer/ngữ cảnh ứng tuyển đạt. E2E kiểm tra liên kết đúng ứng viên–tin–hội thoại, badge chưa đọc, bộ lọc mobile, quy tắc duyệt CV, giữ hồ sơ khi đóng tin và responsive/axe cho toàn bộ trang ở 360/768/1440px. Đã xem ảnh thực tế của dashboard và danh sách ứng viên desktop/mobile.

## Trang chi tiết hồ sơ ứng tuyển

- Danh sách dùng liên kết “Xem hồ sơ” mở `/employer/candidates/:id`, thay cho accordion và sidebar chi tiết. `id` là mã đơn ứng tuyển, không phải mã ứng viên: thông tin CV, tin tuyển dụng và điểm AI luôn cùng một đơn.
- Trang riêng gồm thông tin ứng viên, tin đã ứng tuyển, CV, thư giới thiệu, xét duyệt và phân tích AI; có liên kết hồ sơ cùng tin, sửa đúng tin và nhắn tin đúng hội thoại. Desktop chia cột nội dung và tác vụ; mobile xếp dọc.
- Liên kết quay về chỉ mang theo các bộ lọc hợp lệ, thứ tự và trang danh sách; không nhận URL quay về tùy ý. Dashboard, thông báo và tin nhắn dẫn thẳng đến route mới; bookmark cũ `?application=:id` được chuyển hướng tương thích.
- Route kiểm tra phiên và vai trò trước khi tra cứu đơn, xác minh tin thuộc công ty hiện tại; mã sai hoặc đơn không thuộc quyền truy cập hiển thị 404. Chế độ API vẫn không dùng dữ liệu mẫu thay thế.
- Mở trang chi tiết không đánh dấu đã xem CV. Chỉ nút xem PDF thực hiện quy tắc FR-06.5; rời trang đóng PDF, quay lại giữ trạng thái xét duyệt trong provider. Các quy tắc đơn đã rút, tin đóng/hết hạn và PDF minh họa vẫn giữ nguyên.

Kiểm chứng trang chi tiết: build/typecheck, lint, 58 unit test, 23 E2E employer và 17 E2E xác thực qua API fixture đều đạt. Có kiểm tra quay lại đúng bộ lọc/trang, chuyển hướng bookmark cũ, 404, đóng modal khi điều hướng, quy tắc xem CV và responsive/axe ở 360/768/1440px; đã xem ảnh danh sách và trang chi tiết desktop/mobile.
