# Trang chủ chung, sắp xếp việc làm và phân trang

Quyết định ngày 19/10/2026 theo yêu cầu cập nhật: bỏ trang tìm kiếm doanh nghiệp riêng. Trang chủ công khai dùng chung cho ứng viên và nhà tuyển dụng; mục doanh nghiệp dẫn thẳng tới hồ sơ công ty. Giữ hồ sơ công ty theo FR-04.7, giữ khu vực quản lý của từng vai trò.

- `/companies` và URL tìm kiếm doanh nghiệp cũ chuyển về `/#top-companies`. Gỡ giao diện, bộ lọc, dịch vụ danh sách và CSS riêng của directory. Điều hướng header/footer và breadcrumb hồ sơ dùng trang chủ chung. Bỏ liên kết “Xem tất cả doanh nghiệp” vì không còn trang danh sách riêng.
- Thay nhãn “Dữ liệu minh họa” trên danh sách Jobs bằng Select dùng Radix hiện có, với đúng bốn nhãn được yêu cầu. Giữ font, màu xanh, menu và chuyển động của sản phẩm.
- `sort=default` (không ghi vào URL) dùng `updated_at` giảm dần theo SRS, hòa thì ID giảm dần. `newest` dùng ngày tạo tin, hòa thì ID giảm dần. `salary_desc` dùng lương tối đa được công bố, hoặc lương tối thiểu nếu chỉ có mức khởi điểm; tin thỏa thuận/chưa công bố xếp sau tin có số lương. Hòa thì dùng thứ tự mặc định.
- `relevance` dựa trên từ khóa không phân biệt dấu: khớp chức danh 3 điểm, kỹ năng 2 điểm, tên công ty 1 điểm. Hòa hoặc chưa nhập từ khóa dùng thứ tự mặc định. Đây là cách xếp hạng tìm kiếm dữ liệu mẫu, không dùng AI hay hồ sơ cá nhân.
- Sắp xếp sau lọc và trước phân trang. Đổi cách sắp xếp hoặc bộ lọc về trang 1; giữ từ khóa, địa điểm và các điều kiện còn lại. URL là nguồn trạng thái để tải lại, chia sẻ và Back/Forward hoạt động đồng nhất. Navbar giữ tham số sort khi tìm lại.
- Một component phân trang dùng ô vuông viền nhạt, trang hiện tại xanh, nút đầu/trước/sau. Theo yêu cầu cập nhật, cả desktop và mobile hiển thị tối đa 4 số trang. Ẩn nút đầu/trước ở trang đầu; ẩn nút sau ở trang cuối. Ô desktop 50px, mobile rộng 40px và cao 44px để cả 7 điều khiển vừa màn hình 360px. Dấu chấm carousel trang chủ vẫn điều khiển nhóm nội dung riêng.

Giả định và giới hạn: tiếp tục dùng service dữ liệu mẫu hiện có do chưa có API danh sách từ Laravel. Không thêm thư viện, dữ liệu cá nhân hay quyền truy cập. Khi nối API, Laravel cần whitelist cùng tham số và áp dụng thứ tự trước paginate. Hiệu năng với dữ liệu/traffic thật cần đo khi có backend; kiểm tra hiện tại tập trung tính đúng thứ tự, URL, bàn phím và responsive.

Phương án chọn: chuyển hướng URL cũ thay vì để 404, giữ hồ sơ để không làm đứt liên kết từ tin tuyển dụng; tái sử dụng Select và một component phân trang thay vì duy trì hai kiểu hiển thị.

Thiết kế giữ hướng giao diện tuyển dụng gọn, thiên về thao tác: Be Vietnam Pro, navy/xanh nhận diện, nền xám và card trắng. Khoảng cách điều khiển 6–12px, chiều cao vùng bấm tối thiểu 44px; menu và reduced motion dùng quy tắc chung. Không thêm một hướng mỹ thuật hay hiệu ứng mới.

Đã kiểm tra:

- `npm run lint`, `npm run typecheck`, `npm run build` thành công; 36 unit tests thành công.
- Toàn bộ 52 browser tests Chromium thành công. Sau chỉnh liên kết “Việc làm mới nhất” và scroll margin, chạy lại 14 bài sorting/company liên quan: thành công.
- Xác minh cả bốn lựa chọn, thứ tự dữ liệu trước paginate, đổi sort về trang 1, giữ lọc qua navbar/phân trang/tải lại/Back, điều khiển bàn phím và phục hồi focus.
- Axe không phát hiện lỗi WCAG A/AA trong menu sắp xếp và trang Jobs tại 360/1440px; hồ sơ doanh nghiệp không tràn ở 360/390/768/1024/1440px. Đã xem ảnh desktop/mobile. Luồng profile giữ các trạng thái rỗng/not-found; loading và error boundary hiện có được giữ.
- Mở thực tế `localhost:3000`: sort hydrate đúng “Mặc định”; URL `/companies?page=3` chuyển về mục doanh nghiệp của Home. Không đọc/thay đổi `.env.local`.

Chưa kiểm tra Firefox/Safari hoặc trình đọc màn hình thực tế; chưa có backend để đo tải hay xác minh thứ tự bằng truy vấn SQL. Nhánh `fix/shared-home-job-sorting` nối tiếp `feature/company-discovery-fe` để giữ đầy đủ các trang hiện có, không dùng worktree.

Cập nhật giới hạn 4 số trang: build/lint và 36 unit tests thành công; 4 browser tests sorting/pagination thành công, gồm kiểm tra 7 điều khiển cùng một hàng ở trang 2 trên 360/1440px, giữ sort khi chuyển trang, ẩn nút trước/sau tại biên và trở về trang đầu. Đã xem ảnh phân trang thực tế tại localhost:3000 ở cả hai kích thước.
