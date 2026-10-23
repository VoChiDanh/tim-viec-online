# Điều chỉnh giao diện xác thực — 18/10/2026

Theo yêu cầu giữ style hiện tại, bỏ panel ngành nghề bên trái để tập trung vào đăng nhập/đăng ký. Form nằm giữa trang, rộng 480px; đăng ký rộng 560px để giữ cặp số điện thoại/ngày sinh. Dưới 600px các trường về một cột. Giữ logo, Be Vietnam Pro, nền xám, card trắng, navy/xanh và footer chung; không thêm minh họa hoặc nội dung quảng cáo.

Ngày sinh dùng shadcn Calendar và Radix Popover. Menu tháng/năm dùng Radix Select với cùng kiểu dropdown của bộ lọc việc làm, không dùng lịch hoặc menu chọn ngày mặc định của trình duyệt. Ngày hiển thị `DD/MM/YYYY` theo NFR-08; có thể gõ ngày hoặc nhập 8 chữ số trên bàn phím số. Lịch có điều hướng bằng phím, chọn nhanh tháng/năm, nút xóa, focus khi đóng và giới hạn chọn đến đúng ngày đủ 15 tuổi. Danh sách năm bắt đầu từ 1900; vẫn cho nhập ngày hợp lệ trước đó và mở lại lịch tại ngày đã nhập, không thêm giới hạn tuổi tối đa.

Một hidden input duy nhất `name="dob"` gửi ISO `YYYY-MM-DD` như hợp đồng Laravel hiện có. Parse theo từng thành phần ngày/tháng/năm, kiểm tra ngày tồn tại, không serialize qua UTC. Khi sửa thành ngày không hợp lệ, giá trị sai thay thế ngày cũ để validation từ chối. Giữ validation trên server, giới hạn tuổi, phân quyền và cơ chế phiên hiện có. Khi chuyển focus trực tiếp đến nút gửi, submit kiểm tra toàn bộ form để thông báo lỗi blur không làm nút dịch chuyển giữa thao tác bấm.

Calendar được thêm từ registry `radix-nova`, giữ nguyên Button đã tùy chỉnh. Các dependency mới: `react-day-picker` và `date-fns`. Dùng animation popover/select và reduced motion chung; không thêm thư viện animation hoặc tài nguyên hình ảnh.

Focus ngày được đặt sau khi portal tính xong vị trí tránh va chạm màn hình, dùng `preventScroll` và không giành lại focus nếu người dùng đã thao tác menu. Chiều cao popup giới hạn theo `--radix-popover-content-available-height`, cuộn bên trong khi khoảng trống trên/dưới ô nhập không đủ; theo dõi vị trí khi trang cuộn. Điều này tránh lỗi ngẫu nhiên menu năm nằm ngoài viewport ở laptop 1280×720. Blur cũng theo dõi thao tác nhấn nút gửi để xử lý trường hợp `relatedTarget=null`; có ca mô phỏng bằng Chromium, chưa thay cho nghiệm thu Safari/iOS thật.

Kiểm chứng tập trung vào chuyển đổi ngày/năm nhuận, nhập số trên mobile, ngày đủ 15 tuổi, dữ liệu ISO, focus lỗi, mở lại lịch, Escape, chọn tháng/năm, axe khi mở lịch/menu và responsive 360–1440px. Kiểm thử API dùng fixture; backend Laravel chưa có đầy đủ endpoint xác thực nên chưa thể nghiệm thu end-to-end với backend thật.

Kết quả: build, lint, TypeScript và `git diff --check` đạt; 31/31 unit test, 11/11 browser test xác thực preview và 15/15 browser test API fixture đạt. Đã xem ảnh đăng nhập desktop, đăng ký desktop/mobile và lịch mở tại `localhost:3000`; kiểm tra ArrowRight → Enter chọn ngày tiếp theo, Escape trả focus. Axe khi mở lịch và menu năm trên mobile không báo vi phạm WCAG A/AA. Chưa kiểm tra Safari/Firefox hoặc trình đọc màn hình thực tế.

Hoàn tất kiểm tra ngày 19/10/2026: ca chọn tháng/năm kèm kiểm tra header nằm trong viewport chạy liên tiếp 5/5 lần đạt sau khi sửa giới hạn chiều cao. Bộ preview 11/11 và API fixture 15/15 chạy lại đều đạt; build/lint/TypeScript đạt. Dev server được mở lại ở cổng 3000 để xem giao diện.
