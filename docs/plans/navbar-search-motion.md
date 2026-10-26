# Chuyển động tìm kiếm trên navbar

Yêu cầu: khi chọn địa điểm, vùng địa điểm giãn từ phải sang trái trước khi dropdown hạ xuống; khi nhập từ khóa, thanh search mở rộng sang phải, hiện panel và làm tối nền như ảnh tham chiếu. Giữ màu navy/xanh/cam, Be Vietnam Pro, form và danh mục tỉnh/thành hiện có.

- `HeaderSearch` điều khiển ba trạng thái: `idle`, `keyword`, `location`. Chỉ giữ một form, một ô từ khóa và một trường `city`; các bộ lọc/category/sort tiếp tục truyền qua GET. Đổi URL hay ẩn trang trong Next Activity sẽ kết thúc trạng thái mở.
- Desktop: vùng địa điểm tăng chiều rộng trong thanh search để mép trái và biểu tượng dịch sang trái, 220ms. Dropdown xuất hiện với chuyển động từ trên xuống 200ms, trễ 180ms; Popper cập nhật liên tục theo anchor để không nằm ở tọa độ cũ. Chuyển từ từ khóa sang địa điểm giữ cùng backdrop.
- Chế độ từ khóa: thanh search tăng chiều rộng sang phải khi nhóm điều hướng bên phải thu lại, 280ms. Panel vào từ trái sang phải trong 240ms, trễ 100ms. Panel dùng từ khóa phổ biến và tin đang tuyển từ repository hiện có, không tạo lịch sử tìm kiếm, lượt đếm hoặc đề xuất cá nhân giả. Kết quả gợi ý trong panel khớp tiêu đề/tên công ty; nút tìm kiếm vẫn gửi form tới luồng Jobs đầy đủ.
- Trên màn hình <=1100px, thanh search đã nằm riêng một hàng nên giữ toàn chiều rộng; dropdown/panel giới hạn theo viewport và cuộn khi thiếu chiều cao. Không kéo dài thanh ra khỏi màn hình.
- Backdrop đen 48% xuất hiện/mất dần; form và popup nằm phía trên. Đây là tương tác không modal: Tab ra ngoài sẽ đóng search; Escape/bấm nền tối đóng; gửi form hoặc đi tới tin cũng đóng. Không trap focus hay vô hiệu hóa ancestor của form.
- `SearchableSelectionField` nhận thêm controlled-open và lớp popup tùy chọn; Home dùng nguyên hành vi nội bộ. Tìm tỉnh/thành, trạng thái rỗng, chọn bằng bàn phím và hidden value được giữ. Khi đóng danh sách, focus trở về nút địa điểm.
- Tất cả duration/delay tuân thủ `prefers-reduced-motion`, không dùng timer điều khiển chuỗi chuyển động; CSS và Radix Presence xử lý đóng/mở. Không thêm thư viện, không thay API Laravel hay cấu trúc database.

Nhánh `feature/navbar-search-motion` nối tiếp `feature/province-location-api` để dùng đầy đủ danh mục địa điểm và component chọn có tìm kiếm đã hoàn thành.

Kiểm chứng: lint/build và 60 browser tests thành công. Sau bổ sung ArrowUp/Down vào gợi ý, Escape trả focus mà không mở lại popup, chạy lại 5 bài search-motion thành công. Kiểm tra 360/1440px với motion thường và reduced motion, thời gian trễ, vị trí Popper sau khi anchor di chuyển, chuyển hai mode, gửi GET giữ lọc/sort, Escape/bấm nền tối và Back không mở lại popup. Đã xem ảnh thực tế hai trạng thái trên localhost:3000. Chưa kiểm thử Firefox/Safari hoặc trình đọc màn hình thực tế.
