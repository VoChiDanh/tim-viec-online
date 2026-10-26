# Thay doanh nghiệp demo bằng hồ sơ doanh nghiệp thật

Yêu cầu: thay toàn bộ 121 công ty hiện có bằng doanh nghiệp có hoạt động tại Việt Nam, tải hình nhận diện và thông tin công khai, cập nhật database đang dùng. Không tạo tài khoản hoặc tin tuyển dụng chính thức thay mặt doanh nghiệp.

## Thiết kế

- Thu thập từ website chính thức; lưu URL nguồn, URL ảnh gốc, ngày thu thập và dữ liệu kiểm chứng trong catalog có thể tái sử dụng.
- Mỗi doanh nghiệp có tên, website, mô tả ngắn tự biên soạn theo nguồn; địa chỉ/quy mô chỉ ghi khi có nguồn rõ ràng, không giữ địa chỉ hoặc số nhân sự hư cấu.
- Thêm `companies.avatar` qua migration, giữ `logo` tương thích; tài nguyên tải về lưu disk public `company_logos/real/`. API trả cùng hình cho avatar/logo, upload mới đồng bộ hai trường.
- Lưu thông tin xuất xứ và đánh dấu hồ sơ dùng trong demo. Trang công khai thể hiện rõ tên/logo là tham khảo, tài khoản/tin/đơn/hội thoại là minh họa, không liên kết chính thức.
- Catalog phân nhóm theo 24 ngành của seed, giữ nguyên company/user/job IDs và tất cả khóa ngoại. Các nội dung seed chứa tên cũ được thay đúng mapping, không sửa nội dung người dùng tự viết.
- Command local/testing có dry-run, backup dữ liệu trước thay đổi, transaction và kiểm tra file/hash. Không tải URL tùy ý trong request web, không hotlink ảnh, không gọi email/AI.

## Kiểm chứng

- [x] Đủ 121 tên duy nhất, website/ảnh nguồn kiểm tra truy cập, tất cả ảnh local hợp lệ.
- [x] Migration/API/upload giữ tương thích; test ownership và không thay đổi quan hệ nghiệp vụ.
- [x] Backup database local, áp dụng migration và cập nhật đúng bộ demo; xác minh counts/IDs giữ nguyên.
- [x] Xem trang chủ, directory, hồ sơ công ty trên trình duyệt; commit code/tài liệu, không commit bí mật.

## Kết quả

- Catalog 121 tên/ảnh duy nhất, 24 nhóm ngành, 65 địa chỉ công khai có nguồn; các trường chưa xác minh để null. Ảnh PNG chuẩn hóa có checksum, logo nguồn trắng được đặt trên nền tối để giữ khả năng nhận diện.
- Đã áp dụng vào `tim_viec_online`, sao lưu trước thay đổi trong disk private. Khôi phục bản sao lưu vào DB so sánh riêng trên cổng 33063 để đối chiếu: counts các bảng không đổi (trừ migration mới), ID/chủ sở hữu công ty, ID/quan hệ tin, đơn/CV, hội thoại và nội dung chat giữ nguyên. Chạy lại bỏ qua đủ 121 hồ sơ.
- Backend: 68 tests, 890 assertions; frontend: 95 unit + 10 server tests; 21 browser tests trang chủ/công ty. Build, lint và format đạt. Browser dùng API thật xác nhận ảnh local, nguồn hồ sơ và nhãn minh họa ở trang chi tiết việc làm, không tràn ngang ở 360/1440px.
