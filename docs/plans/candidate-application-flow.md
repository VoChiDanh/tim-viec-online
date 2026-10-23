# Frontend ứng tuyển và lưu việc làm

Phạm vi: frontend ứng viên; đối chiếu SRS FR-03, FR-05, FR-06 và thiết kế `design/page_job_detail/index.html`. Giữ font Be Vietnam Pro, màu xanh thương hiệu, CTA cam và thành phần Radix hiện có.

## Đã triển khai

- Dùng một workspace mock theo tài khoản ở root layout, giữ CV và trạng thái khi chuyển giữa home, việc làm và tài khoản. Không tạo dữ liệu ứng viên cho khách hoặc nhà tuyển dụng; chế độ API không nhận fixtures.
- Lưu/bỏ lưu từ home, danh sách hoặc chi tiết việc làm; đồng bộ danh sách “Việc đã lưu”.
- Dialog ứng tuyển chọn CV mặc định hoặc PDF riêng cho công việc, thư giới thiệu tùy chọn tối đa 5.000 ký tự. Không sửa CV mặc định khi chọn CV riêng.
- Kiểm tra PDF không rỗng, tối đa 5 MiB, phần mở rộng, MIME và chữ ký `%PDF-`. Kiểm tra lại tin còn nhận hồ sơ theo ngày Việt Nam và chống nộp trùng sau bước đọc file bất đồng bộ.
- Tạo trạng thái `applied`, hiển thị ngay trong “Việc làm của tôi”. Hồ sơ có bản CV riêng và thư giới thiệu để xem lại, thay CV cá nhân không làm đổi đơn cũ.
- Giữ file trong bộ nhớ, thu hồi blob URL khi không sử dụng; tải lại trang hoặc đăng xuất sẽ kết thúc dữ liệu phiên. Không lưu CV/thư giới thiệu vào localStorage.
- Dialog có focus trap, trả focus, thông báo lỗi, khóa thao tác đóng khi đang gửi và dọn portal khi route bị ẩn.

## Điểm nối backend

`ApplyInput`/`ApplyResult` trong `features/candidate-workspace/application.ts` là hợp đồng lệnh phía client. `submitApplication` và `toggleSaved` trong workspace provider hiện thực bằng bộ nhớ; sau này tách chúng thành adapter gọi API đã thống nhất. Gửi CV bằng multipart FormData, nhận DTO đơn từ server, cập nhật/invalidate danh sách và hiển thị lỗi từ adapter. Không gửi `File` qua Server Component props.

Backend cần cung cấp trạng thái đã lưu/đã ứng tuyển khi đọc việc làm, CV mặc định có quyền truy cập, danh sách đơn và API ghi tương ứng. Backend phải kiểm tra lại quyền ứng viên, quyền sở hữu CV, dung lượng/nội dung file, hạn nhận hồ sơ và ràng buộc chống nộp trùng. Chưa có API nên chế độ API vẫn hiển thị trạng thái chưa khả dụng, không dùng mock thay dữ liệu thật.

Chưa thực hiện upload thật, phân tích PDF scan/font, AI Match Score hoặc gửi hồ sơ/thông báo sang workspace nhà tuyển dụng. Giao diện thông báo rõ thao tác chỉ lưu trong phiên xem trước. SRS là nguồn quy tắc 4 trạng thái hiện hành; không bổ sung trạng thái rút hồ sơ từ mô tả README cũ.

## Kiểm chứng

Test nghiệp vụ biên hạn nộp, trùng ở mọi trạng thái và giới hạn thư giới thiệu; E2E kiểm tra upload sai định dạng, CV mặc định/CV riêng, nộp một lần, snapshot, lưu việc xuyên trang, logout reset, đóng portal khi điều hướng và bố cục/focus/axe ở 360, 768, 1440px. Chạy thêm hồi quy account layout, profile, candidate workspace và xác thực mock/API.
