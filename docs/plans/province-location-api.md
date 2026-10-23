# Danh mục tỉnh/thành phố dùng chung

Theo yêu cầu ngày 19/10/2026, ô địa điểm ở Home và navbar sử dụng cùng danh mục lấy từ [GET /api/v1/new-provinces](https://www.tinhthanhpho.com/api-docs#get-apiv1new-provinces). Không giới hạn địa điểm theo các tin tuyển dụng đang có.

Đã gọi API thực tế: `success: true`, `metadata.total: 34`, `data_version: 2026.10.8`, nhận đủ 34 mục với `limit=100&page=1`. Chỉ giữ mã và tên tỉnh/thành; giữ tên trả về từ API. Không dùng endpoint tỉnh/thành cũ và không cần khóa API.

- `features/locations/provinces.ts` kiểm tra envelope, mã/tên, metadata phân trang, trùng lặp và dữ liệu thiếu. Yêu cầu 100 mục/trang, đọc tiếp nếu nhà cung cấp giới hạn số mục thực nhận. Tổng thời gian tối đa 5 giây cho toàn bộ lượt lấy danh sách, tối đa 10 trang. Chỉ chấp nhận danh sách đầy đủ.
- `services/locations.ts` là adapter server-only, dùng Next `use cache` và `cacheLife`: dữ liệu API làm mới sau một ngày; nếu lỗi, dùng snapshot đầy đủ từ chính API, thử làm mới sau 5 phút. Không gọi API theo từng lần mở dropdown, không gửi cookie đăng nhập đến bên thứ ba.
- Snapshot mã/tên có nguồn và ngày xác minh 19/10/2026. Dùng khi timeout, rate limit, mất mạng hoặc schema sai, giúp ô địa điểm tiếp tục có đủ danh sách. Snapshot cần cập nhật có kiểm chứng nếu nhà cung cấp thay đổi đơn vị hành chính. Có cảnh báo tổng quát ở server khi dùng fallback.
- Home bỏ danh sách bốn địa điểm viết cố định. Navbar bỏ danh sách suy ra từ fixture Jobs. Hai nơi dùng cùng service; menu tùy chỉnh, cuộn và bàn phím hiện có được giữ.
- Giữ hợp đồng `city` dạng chuỗi để ghép Laravel. So sánh tên khi lọc không phân biệt dấu và bỏ tiền tố `TP.`, `Thành phố`, `Tỉnh`, giúp tên API “Hồ Chí Minh” khớp tin cũ “TP. Hồ Chí Minh”. Không suy diễn việc chuyển các địa danh cũ đã sáp nhập khác sang tỉnh mới; backend cần quy tắc chuyển dữ liệu nếu có trường hợp đó.
- README ghi rõ mọi danh sách cần phân trang phải dùng lại `components/layout/pagination.tsx` và helper tương ứng, tối đa 4 số trang; không tạo design phân trang mới.

Nhánh `feature/province-location-api` nối tiếp nhánh `fix/shared-home-job-sorting` để giữ các component đã hoàn thành. Không đổi backend, database hoặc file môi trường.

Kiểm chứng:

- Gọi adapter thực tế bằng Node: `source=api`, 34 mục, có Vĩnh Long ở cuối danh sách. Build không phải dùng fallback.
- `npm run lint`, `npm run typecheck`, `npm run build`: thành công. 41 unit tests kiểm tra parser, phân trang API bị giới hạn, lỗi/timeout/429/JSON sai, danh sách thiếu/trùng, giới hạn vòng lặp và tên thành phố tương thích tin cũ.
- 54 browser tests Chromium thành công, gồm đủ 34 lựa chọn và mục “Tất cả địa điểm” giống nhau giữa Home/navbar ở 360/1440px; chọn Vĩnh Long, kết quả rỗng đúng, giữ giá trị khi tải lại, cuộn bằng bàn phím và khôi phục focus. Axe không phát hiện lỗi WCAG A/AA trong menu đã kiểm tra.
- Kiểm tra trực tiếp localhost:3000 nhận đủ 35 lựa chọn; xem ảnh menu khi cuộn tới Vĩnh Long.

Chưa kiểm tra Firefox/Safari hoặc tải lớn ngoài môi trường cục bộ. Backend Laravel chưa được thay đổi để nhận mã tỉnh, nên query `city` tiếp tục truyền tên.

Ô tìm nhanh trong dropdown: Home và navbar dùng chung `SearchableSelectionField`, ghép từ Popover/Input hiện có. Ô “Tìm tỉnh/thành phố…” ở đầu popup, danh sách cuộn bên dưới. Lọc tên không phân biệt dấu bằng dữ liệu đã tải, không gửi từ khóa tìm địa điểm tới API hoặc form Jobs. Không thay đổi địa điểm đã chọn khi chỉ nhập từ khóa; chọn một mục mới cập nhật hidden `city`. Giữ “Tất cả địa điểm” và nút xóa khi không tìm kiếm. Đóng popup sẽ xóa từ khóa tìm tạm.

Bàn phím: ArrowDown/Up mở popup và từ ô tìm chuyển vào danh sách; Arrow/Home/End điều hướng lựa chọn; Enter chọn; Escape đóng và trả focus. Home/End trong ô nhập giữ hành vi chỉnh sửa văn bản; hỗ trợ nhập tiếng Việt đang composition. Có trạng thái không tìm thấy tỉnh/thành phố. Đã xem ảnh thực tế ở 360/1440px và kiểm tra tìm `da nang` ra “Đà Nẵng”.

Kiểm chứng cập nhật ô tìm kiếm: lint/build và toàn bộ 55 browser tests Chromium thành công. Kiểm tra tìm không dấu, không có kết quả, nhập/chọn bằng bàn phím không tự gửi form, giữ sort khi gửi tìm việc, reset từ khóa khi mở lại, danh sách đủ 34 tỉnh/thành và Axe ở desktop/mobile. Chỉ đổi component chọn địa điểm; các Select của bộ lọc khác giữ nguyên.
