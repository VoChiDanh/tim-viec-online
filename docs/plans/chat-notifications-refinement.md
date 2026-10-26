# Chỉnh lại hộp thư và bỏ thông báo tìm việc tự động

Yêu cầu: cải thiện UI/UX tin nhắn; bỏ tạo thông báo việc làm, chỉ giữ thông báo ứng tuyển và tin nhắn. Tài liệu này thay thế phần job alerts trong kế hoạch candidate-workspace trước đó.

Hướng giao diện: hộp thư làm việc gọn, chữ đọc rõ, giữ Be Vietnam Pro, xanh TimViecOnline và các biến màu hiện có. Sidebar tài khoản thu gọn trong trang chat; danh sách hội thoại và lịch sử cuộn độc lập trong card giới hạn theo viewport. Mobile dùng danh sách/hội thoại riêng, nút quay lại có tên truy cập. Không thêm thư viện hoặc trạng thái online/đã xem giả.

UX: tìm và xóa từ khóa nhanh, tên công ty/vị trí/tin gần nhất rõ ràng, ngày phân nhóm và giờ HH:mm. Composer tự giãn 44–132px, giữ nháp theo phòng, hỗ trợ Ctrl/⌘+Enter và IME. Tự cuộn cuối khi gửi hoặc đang gần cuối; giữ vị trí khi đọc lịch sử, có nút xuống cuối. Focus sau chọn/quay lại, không tự giành focus khi Activity khôi phục trang. Dữ liệu vẫn chỉ trong bộ nhớ preview, kiểm tra 1–1.000 ký tự và escape HTML như cũ.

Loại bỏ component, state, type, validation và CSS của job alerts. Sidebar/header chỉ còn Thông báo, dẫn tới ứng tuyển/tin nhắn; bỏ tab tạo thông báo. `/preview/alerts` và `/account/alerts` chuyển hướng về trang notifications tương ứng để URL cũ tiếp tục dùng được. Guard preview và role candidate vẫn giữ. Tùy chọn email cho ứng tuyển/tin nhắn trong settings giữ lại, không hứa gửi thật.

Kiểm chứng: build/lint/unit, chat keyboard/draft/IME/scroll/composer, các URL cũ và liên kết mới, trạng thái đọc, auth guard, responsive 360/768/1440 và Axe; xem screenshot trước khi hoàn tất. Chưa có API nghiệp vụ/Reverb; không kiểm chứng giao tin thực hoặc độ trễ.

Kết quả 19/10/2026: production build/TypeScript và lint đạt, 48 unit tests đạt; toàn bộ 10 ca workspace gồm composer/IME/scroll, URL cũ, thông báo, draft, mobile/focus và Axe 360/768/1440 đạt. Đã xem ảnh desktop/mobile. Hồi quy preview đạt 78/79 ở lượt toàn bộ; ca keyboard sorting tại 1440px không đổi trong lượt này đã đạt khi chạy lại riêng (không sửa test/implementation sorting). 17 ca API authentication fixture đạt, gồm chuyển hướng `/account/alerts`, chặn preview trong API mode và phân quyền candidate. Kiểm tra diff không lỗi whitespace. Chưa kiểm thử screen reader thủ công, Safari/Firefox hoặc mobile keyboard trên thiết bị thật.
