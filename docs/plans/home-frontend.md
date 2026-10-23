# Trang chủ theo design/page_home — 18/10/2026

Yêu cầu: triển khai `/` bám sát bản HTML người dùng cung cấp; chỉ điều chỉnh để đồng bộ với các trang đang có. Giữ thứ tự và nội dung hero, việc làm tốt nhất, ngành nghề trọng điểm, doanh nghiệp hàng đầu và banner tuyển dụng. Không thêm section hoặc thay đổi hướng thiết kế.

- Đo từ ảnh reference 1440px: header 69px, hero 385.6px, capsule 960px, container 1360px có padding 21.6px, khoảng section 43.2px. HTML mẫu dùng root 90%; quy đổi rem riêng cho home để không thay đổi trang khác. Grid việc làm 3/2/1 cột, ngành nghề 5/3/2, doanh nghiệp 6/3/2.
- Header home giữ cùng logo/menu/phiên đăng nhập và không có tìm kiếm bên trong; thanh tìm kiếm nằm trong hero như mẫu. Biến thể header được chọn trên server bằng layout/page, không đọc pathname để render lại toàn bộ layout. Logo chung dẫn về `/`; footer chung giữ giao diện hiện tại theo ngoại lệ đồng bộ.
- Hero dùng `next/form` và `SelectionField` hiện có; keyword mặc định theo mẫu, city dùng tên đầy đủ và URL `/jobs`. Dùng Radix dialog hiện có cho lưu việc làm; không sao chép profile/badge thông báo giả và bộ điều hướng prototype.
- Bổ sung sáu tin mẫu đúng tiêu đề/công ty vào cùng repository phục vụ tìm kiếm và chi tiết, id101–106. Không trỏ nhiều card vào cùng một tin không liên quan. Giữ 18 tin cũ và hai trạng thái đóng/hết hạn. Các ngành chưa có ID trong SQL dùng từ khóa; doanh nghiệp dẫn tới tìm việc theo tên công ty cho đến khi trang doanh nghiệp được triển khai.
- Carousel việc làm có sáu nhóm, mỗi nhóm sáu card, dịch bốn tin giữa các nhóm để giữ hai tin tiếp giáp; nhóm đầu giữ đúng sáu card trong mẫu. Danh mục chuyển nhóm bằng mũi tên; không tự động chạy để tránh mất nội dung khi đọc và tôn trọng giảm chuyển động.
- Giả định: dữ liệu và số liệu marketing trong bản thiết kế là mẫu frontend, chưa phải dữ liệu Laravel. Giữ service riêng để thay adapter sau; không sửa database/API. Đồng bộ màu chữ tương phản, màu CTA và lương VNĐ theo trang jobs/SRS; không dùng USD hoặc menu native. Không thêm dependency.
- Kiểm chứng: build/lint/typecheck, tìm kiếm/city/trends, card đúng chi tiết, lưu yêu cầu đăng nhập, carousel/mũi tên, CTA nhà tuyển dụng, logo, axe, mobile không tràn từ360px, so sánh ảnh/đo hình học với HTML mẫu và kiểm tra trực tiếp cổng3000. Mục tiêu99% là yêu cầu bám mẫu, không tuyên bố điểm pixel similarity khi chưa đo.

## Kết quả đối chiếu

Ở viewport1440px, các mốc đo được trùng với HTML mẫu (sai số làm tròn dưới0.1px):

| Thành phần | Vị trí/kích thước |
|---|---|
| Hero | y69, cao385.56px |
| Tìm kiếm | x240, y315.77, rộng960px, cao52.41px |
| Việc làm tốt nhất | x61.59, y490.56, rộng1316.81px, cao392.70px |
| Grid ngành nghề | y976.84, cao144.47px |
| Grid doanh nghiệp | y1232.89, cao145.06px |
| Banner nhà tuyển dụng | y1421.14, cao309.66px |
| Footer dùng chung | bắt đầu y1824.80 |

Các khác biệt có chủ ý: logo/footer/menu và phiên đăng nhập thật theo UI chung; CTA/lương/nhãn phụ đủ tương phản; AEON dùng lương mẫu21–40triệuVNĐ theo SRS; badge dùng “Thỏa thuận” như trang jobs; nút chỉ báo carousel có vùng bấm24px. Mobile sửa lỗi tràn sẵn có của prototype, dùng header responsive và capsule xếp dọc. Không sao chép routes drawer hoặc danh tính/thông báo giả.

Build production, ESLint, TypeScript và28 unit test đạt. Suite browser35 tình huống có33 đạt ban đầu; hai ca mới sửa dữ liệu tìm kiếm trong test và selector để bỏ DOM ẩn do Next Activity, sau đó chạy lại cả9 ca home và đều đạt. Đã kiểm tra trực tiếp cổng3000, xem ảnh desktop/mobile và chạy axe khi đóng/mở dropdown. Chưa kiểm tra Safari/Firefox hoặc Laravel thật.

Nhánh `feature/home-fe` dựa trên giao diện đã hoàn thiện ở `feature/auth-fe`. Nguồn dữ liệu dùng chung hiện có24 tin đang mở; 18 tin cũ giữ thứ tự trang đầu và các trạng thái đóng/hết hạn. Danh sách doanh nghiệp riêng chưa triển khai: các thẻ tìm việc theo tên công ty, liên kết xem tất cả mở danh sách việc làm hiện có. Số liệu marketing/count trong home là fixture từ bản thiết kế.
