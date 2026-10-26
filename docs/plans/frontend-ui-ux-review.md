# Rà soát UI/UX frontend trước tích hợp develop

Ngày: 26/10/2026. Nhánh thực hiện: `feature/frontend-integration`.

## Phạm vi và tiêu chí

Đối chiếu README, SRS và các thiết kế hiện có cho giao diện công khai, xác thực, ứng viên, nhà tuyển dụng và quản trị viên. Giữ font Be Vietnam Pro, màu thương hiệu, border, các control Radix/shadcn và animation hiện có. Ưu tiên sửa hành vi gây mất ngữ cảnh, mất focus hoặc khóa trang khi điều hướng.

Theo yêu cầu đã thống nhất, **ứng viên không được xem kết quả đánh giá AI**. Đợt này không bổ sung nghiệp vụ backend hoặc đưa dữ liệu mock vào chế độ API.

| Nhóm           | Các trang/luồng đối chiếu                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Công khai      | Home, tìm kiếm/lọc/sắp xếp, kết quả rỗng, chi tiết việc làm, khám phá và chi tiết công ty, trang không tồn tại                     |
| Xác thực       | Đăng nhập/đăng ký, quên/đặt lại/đổi mật khẩu, chuyển hướng sau đăng nhập, truy cập sai vai trò                                     |
| Ứng viên       | Hồ sơ, PDF/ảnh đại diện, việc đã lưu/đã ứng tuyển, tin nhắn, thông báo, cài đặt và bảo mật                                         |
| Nhà tuyển dụng | Tổng quan, danh sách/tạo/sửa tin, hồ sơ ứng viên và trang chi tiết đơn theo tin, CV, xét duyệt, tin nhắn, thông báo, hồ sơ công ty |
| Quản trị viên  | Tổng quan, danh sách/chi tiết tin cần kiểm duyệt, tài khoản, ngành nghề, kỹ năng, menu và điều hướng mobile                        |

Kiểm tra giao diện mobile/desktop, thứ tự Tab, Escape, focus sau thao tác, Back/Forward, popup/drawer, trạng thái loading/rỗng/lỗi, tính ổn định bố cục và giới hạn quyền truy cập. Các route preview cũ được kiểm tra như đường dẫn chuyển hướng hoặc bị chặn, không coi là trang nghiệp vụ độc lập.

## Các lỗi đã sửa

1. Link “Quay lại xem việc làm” trên trang đăng nhập không còn dẫn trở lại route riêng tư và tạo vòng lặp đăng nhập. Link vẫn giữ trang việc làm công khai hợp lệ; đăng nhập thành công vẫn tới đích riêng tư được phép.
2. Nút Hủy khi tạo/sửa tin xóa nội dung nháp và lỗi validation của lần sửa đó. Điều hướng tạm sang mục khác vẫn giữ nháp. Kết quả đọc logo bất đồng bộ không được cập nhật công ty sau khi người dùng đã rời form.
3. Drawer mobile và menu tài khoản employer/admin đóng khi đổi route, dùng Back/Forward hoặc workspace bị Next Activity ẩn. Portal cũ không giữ khóa cuộn trên trang mới.
4. Đọc một hoặc tất cả thông báo không làm rơi focus xuống body. Focus chuyển tới thao tác đọc tiếp theo hoặc tiêu đề danh sách khi hết mục; liên kết tới hồ sơ/hội thoại vẫn điều hướng bình thường.
5. Tab/Shift+Tab thoát dropdown theo đúng thứ tự control trong trang, kể cả ô tìm địa điểm. Popup ở portal không giữ vòng lặp Tab hoặc kéo focus về trigger sau khi đóng; cuộn và hình học trang được giữ ổn định.
6. Trang 404 công khai, tài khoản và tuyển dụng dùng nội dung tiếng Việt, kiểu thẻ/nút chung và lối quay lại phù hợp. Không lồng hoặc nhân đôi landmark `main`/header khi dùng chung shell.

## Kiểm chứng

Thực hiện trong `frontend/` trên source cuối đợt rà soát:

| Kiểm tra                                                                                 | Kết quả                              |
| ---------------------------------------------------------------------------------------- | ------------------------------------ |
| `npm run build`                                                                          | Đạt, bao gồm kiểm tra TypeScript     |
| `npm run lint`                                                                           | Đạt                                  |
| Prettier cho các file source/test thay đổi                                               | Đạt                                  |
| `npm test`                                                                               | 73 test đạt                          |
| `npm run test:mock-auth`                                                                 | 8 test đạt                           |
| `npx playwright test --output=test-results/mock-verified`                                | 197 test đạt trên Chromium           |
| `npx playwright test --config playwright.auth.config.ts --output=test-results/api-final` | 18 test đạt với API fixture          |
| `npx playwright test --config test-results/firefox-audit.config.ts`                      | 22 test hồi quy mới đạt trên Firefox |

22 test mới bao phủ sáu nhóm lỗi trên. Bộ E2E hiện có tiếp tục kiểm tra ứng tuyển, phân quyền, validation, menu, thông báo, PDF, responsive/axe, animation và bố cục bộ lọc/sidebar.

Đã dùng trình duyệt chụp và đo 32 tình huống route/trạng thái ở 360px và 1440px: **64 trường hợp không tràn ngang, mỗi trang có một `main` và một `h1` hiển thị, không ghi nhận lỗi JavaScript**. Đã xem trực tiếp ảnh đại diện của các nhóm trang ở mobile/desktop. Các bộ E2E bổ sung kích thước tablet và kiểm tra tương tác; không suy ra toàn bộ hành vi chỉ từ ảnh chụp.

Đã kiểm tra thêm employer/admin đi từ workspace ra trang công khai rồi Back/Forward: chỉ một `main` hiển thị và body không còn khóa cuộn. Cấu hình Firefox và ảnh chụp thủ công nằm trong `test-results/` được ignore; không thêm browser binary hoặc artifact vào Git.

## Giới hạn kết quả

Đây là kiểm chứng frontend với mock nghiệp vụ và API fixture xác thực. Upload/lưu file thật, dữ liệu bền vững, email, Gemini và realtime liên tài khoản cần kiểm thử lại khi ghép Laravel. Chưa kiểm chứng Safari, thiết bị vật lý hoặc tải đồng thời; không coi kết quả này là chứng nhận các NFR vận hành backend.

Không merge `develop` hoặc push remote trong đợt rà soát này.
