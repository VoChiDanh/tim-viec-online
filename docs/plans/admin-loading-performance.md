# Tải trang quản trị và skeleton

Phạm vi: FR-09, giữ kiểm tra phiên và vai trò tại từng trang; không cache chung dữ liệu quản trị.

1. Bỏ việc đọc lại toàn bộ workspace tại các trang con; layout/provider giữ snapshot và cập nhật sau thao tác.
2. Bootstrap chỉ chứa dữ liệu tóm tắt tin. Trang chi tiết lấy nội dung đầy đủ qua endpoint có phân quyền.
3. Thêm skeleton theo bố cục từng trang và khung admin cho lần vào đầu; giữ header/sidebar khi chuyển trang.
4. Kiểm thử request đếm/delay ở API fixture, quyền sau khi phiên hết hạn, nội dung chi tiết và thao tác mock/API.
5. Đo kích thước bootstrap trên dữ liệu local, chạy build/lint/unit/backend/browser phù hợp và ghi nhận kết quả.
