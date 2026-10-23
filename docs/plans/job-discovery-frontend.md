# Frontend tìm kiếm và chi tiết việc làm

## Phạm vi đã thống nhất

Mốc đầu tiên phục vụ khách tìm việc: tìm kiếm, lọc, phân trang, xem chi tiết và nhận yêu cầu đăng nhập khi lưu/ứng tuyển. Chuyển thiết kế HTML hiện có sang Next.js; chưa triển khai backend, báo cáo AI, chat hoặc tài khoản đăng nhập. Người dùng đã yêu cầu bắt đầu triển khai sau khi chọn luồng này.

## Nguồn và quyết định

- README yêu cầu nhánh feature từ develop: `feature/job-discovery-fe`. Theo yêu cầu của người dùng, code được chuyển về thư mục dự án chính `F:/Soure_Code/tim-viec-online`, làm việc trực tiếp trên branch này. Giữ lịch sử design hiện có và các thay đổi chưa commit của người dùng.
- SRS là nguồn nghiệp vụ ưu tiên khi khác README/SQL. Bản SRS đang chỉnh của người dùng quy định bốn trạng thái ứng tuyển; giới hạn 10 kỹ năng. Mốc này chưa thực hiện xử lý đơn.
- Chọn frontend với repository dữ liệu mẫu thay cho chờ API hoặc dựng backend tạm. Component không đọc MySQL và không import fixture; API adapter sẽ được bổ sung sau khi nhóm thống nhất hợp đồng.
- Giữ nhận diện thiết kế: Be Vietnam Pro, navy, xanh và cam tiết chế, nền slate, card trắng. Hướng giao diện chức năng, rõ ràng; điểm nhận diện là header navy và thẻ việc có thông tin lương nổi bật. Không thay bằng template mới.
- Regenerate shadcn từ Base UI sang Radix theo AGENTS; hiện chỉ có một button mẫu nên thay sớm tránh trộn primitive. Dùng CLI registry, Sonner, Lucide. Alias shadcn theo skill; component nghiệp vụ ở `src/components`.
- Dùng Server Components cho trang, card, repository. Chỉ mobile menu/filter và phản hồi hành động cần client. Giữ Next 16.4 Cache Components; đọc Promise params/searchParams dưới Suspense và đọc clock sau runtime boundary.
- URL là nguồn trạng thái tìm kiếm, bộ lọc và số trang. Refresh, chia sẻ và back/forward phải giữ đúng kết quả. Danh mục dùng ID từ schema, nhiều danh mục kết hợp OR; các nhóm lọc kết hợp AND.
- Lương tuân thủ FR-05.3 đúng phép so sánh. Với lương khởi điểm không có salary_max, không đưa vào nhóm bắt buộc so sánh salary_max; nhóm trên 20 triệu vẫn dựa salary_min. Thỏa thuận tách khỏi nhóm số. Backend cần thống nhất cách xử lý null tương tự trước tích hợp.
- Chỉ liệt kê tin active còn hạn. Chi tiết tin đóng/hết hạn vẫn truy cập được, có thông báo và khóa ứng tuyển. Ngày hạn bao gồm hết ngày đó theo Asia/Ho_Chi_Minh. Mặc định sort updated_at giảm dần, ID giảm dần khi bằng nhau.
- Login là điểm tiếp nối có thông báo chưa có API, không giả xác thực hoặc lưu dữ liệu. Return URL chỉ nhận đường dẫn nội bộ được cho phép; không dùng open redirect. Không render HTML người dùng cung cấp.

## Cấu trúc và dữ liệu

`app/(public)` chứa layout, `/jobs`, `/jobs/[id]`; `/` đưa về danh sách trong mốc này. `features/jobs` chứa type, parse/query/filter và định dạng thuần; `mocks` chứa fixture; `services/jobs` cung cấp list/get/catalog/related. Dữ liệu liên quan công ty và kỹ năng trả về trong job để card và detail nhất quán.

Fixture tiếng Việt gồm nhiều trang và các tình huống ranh giới lương, công việc từ xa/thực tập, lương thỏa thuận/khởi điểm, tin đóng/hết hạn. Mốc này là bản trải nghiệm dữ liệu minh họa, không chứng minh quyền ứng tuyển, upload hoặc trạng thái xác thực thật.

## Chất lượng và giới hạn

- Kiểm tra 360, 390, 768, 1024, 1440px; bàn phím, nhãn, focus, Escape và phục hồi focus cho dialog; reduced motion.
- Có skeleton, trạng thái rỗng/xóa lọc, lỗi/thử lại, không tìm thấy và tin ngừng tuyển.
- Unit test quy tắc SRS, query không hợp lệ, không dấu, biên lương và ngày giờ. Browser test luồng tìm → lọc → phân trang → chi tiết → yêu cầu đăng nhập và lịch sử URL.
- Chạy lint, typecheck, tests, production build và kiểm tra qua production server. Không tuyên bố đạt SLA 50 người dùng, AI, WebSocket hoặc uptime khi chưa có backend.
- Bảo trì: frontend thuộc phạm vi người dùng, backend thuộc nhóm khác. Không sửa database, secrets, nhánh main hoặc bản design nguồn trong mốc này.

## Handoff API

Giữ envelope `{success,message,data,meta}` theo AGENTS; thống nhất với backend multi-category query, phân trang, sort, quyền xem tin đóng, ngày hết hạn theo múi giờ Việt Nam và URL login returnTo. DTO UI chứa dữ liệu công khai, không có users.password/token. Không tự giả định frontend route guard thay thế authorization backend.
