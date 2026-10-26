# Danh sách và hồ sơ doanh nghiệp — 19/10/2026

> Cập nhật: phần danh sách/tìm kiếm doanh nghiệp riêng đã được bỏ theo yêu cầu tiếp theo. Xem [Trang chủ chung, sắp xếp và phân trang](shared-home-job-sorting.md). Hồ sơ doanh nghiệp vẫn được giữ; nội dung dưới đây ghi lại thiết kế ban đầu.

Người dùng chọn triển khai tiếp hai trang công khai `/companies` và `/companies/[id]`. Tham chiếu `design/page_companies/index.html`, `design/page_company_detail/index.html` và FR-04.7. Giữ hướng thiết kế tuyển dụng hiện có: Be Vietnam Pro, navy/xanh, nền xám, card trắng, CTA cam, nhịp 14/22/29px theo mẫu HTML gốc 90%. Dùng chung logo/navbar/footer, focus nhẹ, menu tùy chỉnh và reduced motion.

Danh sách có hero và tìm tên doanh nghiệp, bốn bộ lọc ngành dạng chip, lưới 3/2/1 cột, phân trang thật sáu công ty/trang. Từ khóa hỗ trợ không dấu; GET URL giữ ngành khi tìm kiếm/phân trang, đổi tiêu chí về trang đầu. Trang chi tiết có cover xanh và card nhận diện chồng lên cover, thông tin quy mô/địa điểm/website, danh sách việc làm bên trái và giới thiệu/chi nhánh bên phải. Chia sẻ hồ sơ và liên kết đến việc làm là các thao tác thực tế; theo dõi doanh nghiệp chưa có nghiệp vụ/API nên thay nút phụ bằng chia sẻ. Không dựng điểm AI hoặc dấu xác minh khi dữ liệu không có.

Dữ liệu frontend nằm sau service server-only, không thay backend/database. Giữ company ID1–6 và101–106 từ repository hiện có; dùng201–205 cho năm doanh nghiệp bổ sung theo mẫu. Trang đầu có sáu doanh nghiệp trong thiết kế; các công ty đã có tin xuất hiện ở các trang tiếp theo. Không bổ sung việc làm để làm đầy số liệu. Count/list việc làm dùng chung `isJobOpen` theo ngày Việt Nam; tin đóng và hết hạn bị loại. Các công ty chưa có tin hiện trạng thái rỗng rõ ràng. Số nhân sự và mô tả là fixture minh họa, không phải xác minh doanh nghiệp thực tế.

Quyết định: thêm profile trình bày và ngành doanh nghiệp độc lập với category công việc (SQL chưa có ngành bán lẻ/vận tải). Tái sử dụng repository có request clock và React cache, không đọc đồng hồ khi module load. Dùng Server Component và Suspense cho dữ liệu; form tìm kiếm GET và chip link nên không cần thêm state/thư viện. Tái sử dụng Button/Badge/Skeleton/GuestActions đã có theo `radix-nova`; chỉ chia sẻ dùng client component. Website phải là HTTP(S). Metadata, loading, error/retry, not-found/noindex, empty/reset và focus bàn phím được kiểm tra.

Nối thẻ doanh nghiệp trang chủ, menu “Tất cả công ty” và tên công ty trong việc làm tới route thật. Count trên thẻ công ty trang chủ cũng lấy cùng dữ liệu. Giữ nguyên 24 tin đang mở hiện có. Không thay luồng xác thực, AI, Reverb, nội dung SRS hoặc các file người dùng đang sửa.

Kiểm chứng dự kiến: unit query/pagination/ID/count và tin đóng/hết hạn; browser tìm kiếm, ngành, Back/reload, phân trang, hồ sơ từng công ty, tin đúng công ty, không có tin, URL không hợp lệ, chia sẻ, điều hướng từ home/header/jobs; responsive360/390/768/1024/1440, axe và so ảnh mẫu. Build/lint/TypeScript và các kiểm thử liên quan trước khi hoàn tất. Chưa thể nghiệm thu Laravel thật khi endpoint công ty chưa được triển khai.

## Kết quả

- Build production, lint, TypeScript, `git diff --check` và37/37 unit test đạt. Có6 unit test mới cho dữ liệu, ID, tìm kiếm/lọc, phân trang, tin đang mở và website an toàn.
- 11/11 browser test doanh nghiệp và9/9 test home đạt sau khi cập nhật điều hướng công ty. 13 test Jobs/navbar liên quan cũng đạt. Có kiểm tra từng hồ sơ trong sáu công ty đầu trang, FPT có đúng3 tin, công ty không có tin và ID không hợp lệ/noindex.
- Chromium360/390/768/1024/1440px không tràn ngang. Axe trên directory, hồ sơ có tin/không có tin tại360 và1440px không báo vi phạm WCAG A/AA. Đã xem ảnh desktop/mobile, kiểm tra Enter tìm kiếm giữ ngành, URL/Back/reload, chia sẻ clipboard và dialog lưu việc làm trả focus.
- Đối chiếu HTML mẫu ở1440px: hero cao283.34px, container rộng1316.81px tại x61.59, grid3 cột, cover cao230.4px và card hồ sơ chồng72px. Không tuyên bố tỷ lệ pixel99%. Khác biệt có chủ ý: nhận diện/navbar/footer chung; count thực tế từ fixture; hàng ghi dữ liệu minh họa; breadcrumb; CTA chia sẻ/xem việc làm; màu đủ tương phản; không có điểm AI hoặc badge xác minh giả. Logo công ty hiện là wordmark dự phòng theo mẫu.
- Dev server cổng3000 trước đó chạy bản production cũ; đã khởi động lại bằng `npm run dev -- --port 3000` và xác nhận hai route mới không có lỗi JavaScript trong các luồng đã kiểm tra.
- Kiểm tra nút “Xem việc làm” ở360/390/768/1024/1440px: tiêu đề danh sách sau khi cuộn nằm dưới navbar sticky; dùng scroll margin144px khi navbar có hai hàng,100px ở desktop.

Chưa kiểm thử Firefox/Safari, trình đọc màn hình thực tế, hoặc tiêm lỗi vào boundary/retry. Laravel chưa có endpoint công ty để kiểm thử end-to-end thật. Nhánh `feature/company-discovery-fe` dựa trên nhánh tích hợp hiện có để giữ đầy đủ giao diện và hợp đồng service trước đó.
