# Rà soát hoàn thiện frontend ứng viên và nhà tuyển dụng

Phạm vi theo SRS FR-01–FR-08, FR-10, NFR-07/08; đối chiếu các trang hiện có và các kế hoạch triển khai. Không triển khai backend hoặc admin. Theo yêu cầu người dùng ngày 20/10/2026, **đánh giá AI chỉ hiển thị cho nhà tuyển dụng, ứng viên không được xem**; quyết định này ưu tiên hơn mô tả cũ trong SRS.

## Phạm vi đã có giao diện

| Luồng | Hiện trạng frontend |
| --- | --- |
| Tài khoản | Đăng ký, đăng nhập, quên/đặt lại/đổi mật khẩu, role guard và return path an toàn |
| Khám phá | Home, tìm kiếm không dấu, lọc đa tiêu chí, sắp xếp, phân trang, chi tiết việc làm và công ty |
| Ứng viên | Hồ sơ, chọn tối đa 10 kỹ năng, kiểm tra PDF 5 MiB, preview, lưu việc, CV mặc định/CV riêng, lịch sử và trạng thái ứng tuyển |
| Nhà tuyển dụng | Dashboard, hồ sơ công ty, tạo/sửa/đóng/mở tin, danh sách và trang chi tiết đơn, PDF, xét duyệt, kết quả AI minh họa |
| Trao đổi | Hộp thư hai vai trò, giới hạn 1.000 ký tự, draft từng phòng, IME, giữ liên lạc cho tin đóng |
| Thông báo | Đã đọc/chưa đọc, đọc từng mục/tất cả, liên kết tới hồ sơ/hội thoại tương ứng |

Các luồng nghiệp vụ dùng mock giữ trong phiên; tải lại khôi phục dữ liệu mẫu. Xác thực có adapter API riêng. Chưa coi việc có UI là đã tích hợp dịch vụ thật.

## Đợt tối ưu này

- Đồng bộ chuông/navbar và ngăn thông báo với workspace ứng viên. Trước đây navbar luôn báo chưa tải được dù trang thông báo có dữ liệu. Thêm badge, đọc từng mục/tất cả và liên kết đúng bản ghi; trạng thái chia sẻ qua provider.
- Dùng thời gian tương đối trên thông báo hai vai trò, giữ ngày/giờ Việt Nam đầy đủ trong tooltip. Nhãn ban đầu ổn định khi hydration, cập nhật theo phút, dọn timer khi route ẩn.
- Liên kết kết quả ứng tuyển tính đúng trang trong bộ lọc trạng thái, tránh anchor trỏ tới hồ sơ ngoài trang đang hiển thị. Chỉ mở hội thoại thuộc dữ liệu workspace hiện tại.
- Hồ sơ đã nộp có xem PDF ngay trong dialog, giữ file snapshot riêng của đơn. Blob URL chỉ tạo khi mở và thu hồi khi đóng/ẩn. Không thay đổi trạng thái xét duyệt khi ứng viên xem CV của chính mình.
- Trạng thái danh sách rỗng do bộ lọc có lối quay về toàn bộ hồ sơ.
- Menu công khai hiển thị nhóm tác vụ theo vai trò, nhà tuyển dụng đi thẳng tới tin/hồ sơ/thông báo; giữ luồng khám phá công ty hiện có.
- Thu hồi và xóa URL blob cũ khi đóng/ẩn view, tránh URL đã hết hiệu lực xuất hiện khi mở lại cùng tệp.
- Sửa lỗi được tái hiện bằng Back/Forward: drawer còn mở sau khi trang header đã bị Next Activity ẩn. Điều khiển trạng thái sheet/menu và dọn portal khi view bị ẩn để trang mới không bị khóa tương tác/cuộn.
- Sửa thêm lỗi footer ló lên ở tablet: vị trí cuộn lệch 19px có thể bị giữ lại dù layout không đổi kích thước. Khi đổi mục bằng sidebar, nội dung bắt đầu từ đầu trang và không để Next tự điều chỉnh cuộn lần nữa; giữ nguyên ngưỡng kiểm tra footer.

Giữ font Be Vietnam Pro, xanh/navy thương hiệu, thẻ trắng và các control Radix hiện có. Tập trung khả năng đọc và vùng bấm; không thêm hiệu ứng trang trí hoặc thay đổi animation drawer đã ổn định.

## Phần còn lại thuộc tích hợp dịch vụ

Upload/lưu file thật, phát hiện PDF scan/font lỗi từ parser, phiên dữ liệu bền vững, Gemini, WebSocket, email và cập nhật tức thời liên tài khoản cần backend tương ứng. Các thao tác hiện không giả đã gửi dữ liệu hoặc giả đã phân tích AI. Khi ghép Laravel, thay các phương thức provider bằng adapter và giữ kiểm tra phiên, quyền sở hữu, validation ở server. Không đưa AI ứng viên trở lại.

## Kiểm chứng

Build/TypeScript, lint, 60 unit test và 8 server mock-auth test đạt. Các bộ E2E ứng tuyển, hồ sơ, workspace ứng viên, employer, navbar và account layout đã được chạy; các lỗi phát hiện trong lúc rà soát đều có kiểm tra hồi quy đạt sau sửa. 17 E2E xác thực qua API fixture đạt, không đưa fixture nghiệp vụ vào chế độ API.

Kiểm tra responsive/axe ở 360/768/1440px, drawer không thay đổi hình học trang, focus khi đóng và Back/Forward, xem lại blob PDF, liên kết thông báo và đồng bộ badge/read state. Đã xem ảnh drawer desktop/mobile. Bài kiểm tra sidebar tại 1024px được lặp bốn lần sau sửa cuộn; giữ nguyên yêu cầu footer ở ngoài viewport, không nới ngưỡng để bỏ qua lỗi.

Chưa đánh giá tải đồng thời, parser/Gemini/WebSocket thật hoặc kiểm thử thủ công trên Safari/Firefox; các kết quả trên không phải chứng nhận đạt các NFR vận hành backend.
