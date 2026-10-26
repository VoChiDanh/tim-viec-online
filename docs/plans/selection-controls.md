# Đồng bộ ô chọn — 18/10/2026

Yêu cầu: áp dụng mẫu người dùng cung cấp cho toàn bộ dropdown đang dùng trong frontend. Bộ lọc có giá trị chuyển viền xanh, nhãn xanh nhạt và có nút xóa riêng; menu chọn tùy chỉnh, không mở bộ chọn mặc định của hệ điều hành.

- Giữ Be Vietnam Pro, màu thương hiệu và bố cục trang hiện tại. Phong cách gọn, rõ trạng thái; không thay đổi navbar, card hoặc luồng xác thực ngoài các ô chọn.
- Phạm vi được rà: địa điểm navbar; ngành nghề, hình thức, lương, cấp bậc trang việc làm. Menu tài khoản/danh mục đã dùng Radix. Lần rà ban đầu bỏ sót ngày sinh được render qua hàm form dùng chung; ô này đã được thay bằng calendar tùy chỉnh trong [đợt cập nhật xác thực](auth-ui-refresh.md).
- Dùng shadcn Select (Radix) cho chọn một; Popover + Checkbox hiện có cho nhiều ngành và tìm ngành không dấu. Đây là phương án dùng primitive đang có, giảm mã điều khiển bàn phím so với tự viết listbox; không cần thêm Command/Calendar khi chưa dùng.
- Đưa kiểu menu, viền, màu đã chọn, focus và nút xóa vào component dùng chung. Nút xóa nằm cạnh trigger, không lồng button trong button. Nhãn dài được rút gọn; tên đầy đủ vẫn trong menu và accessible name.
- Giữ mã giá trị và tên field để tích hợp Laravel, tìm kiếm GET, URL/back/reload, chọn nhiều và reset trang. Trạng thái optimistic áp dụng ngay cho bộ lọc; địa điểm navbar giữ thao tác tìm kiếm bằng nút/Enter như hiện tại.
- Giả định: giữ quy mô danh mục và nguồn dữ liệu hiện tại; không thêm API hoặc dữ liệu cá nhân. Popover chỉ dựng menu khi mở; giới hạn chiều cao, cuộn và tránh tràn màn hình từ 360px. Thành phần dùng chung là nơi bảo trì kiểu ô chọn về sau.
- Kiểm chứng: chọn/xóa từng bộ lọc, phối hợp nhiều tiêu chí, tìm trong ngành, Back/reload, GET navbar, bàn phím/Escape/trả focus, axe và responsive. Kiểm tra trực tiếp `localhost:3000` để xác nhận giao diện đang chạy đã cập nhật.

Radix có thể tạo select ẩn để hỗ trợ form; phần người dùng tương tác hoàn toàn là trigger/menu tùy chỉnh. Không dùng CSS để che menu native rồi giữ hành vi native.

## Ô vuông trong danh sách lọc — 19/10/2026

Dropdown hình thức làm việc, mức lương, cấp bậc và địa điểm dùng ô vuông 16px bên trái, đồng bộ với ngành nghề. Mục được chọn có nền xanh và dấu tích trắng; dấu tích cũ bên phải chuyển vào ô vuông. Đây là thay đổi hiển thị trong `selection.css`, giữ nguyên lựa chọn đơn, URL và thao tác bàn phím của Radix Select. Ngành nghề tiếp tục chọn nhiều; menu tháng/năm của lịch giữ kiểu hiện tại.

Kiểm chứng: build và `git diff --check` đạt; 3/3 browser test bộ lọc đạt, bao gồm bàn phím, xóa/lùi URL, axe và menu ở 360/1440px. Đã xem ảnh dropdown hình thức làm việc, kiểm tra ô vuông/dấu tích bên trái ở cả bốn dropdown trên `localhost:3000`.

## Kết quả thực hiện

- Có `SelectionField` và `MultiSelectionField` dùng chung, dựa trên Select được tạo từ CLI shadcn theo `radix-nova`, Popover và Checkbox hiện có. Không thêm dependency. Kiểu nằm trong `selection.css`, dùng biến màu thương hiệu; bỏ CSS cho select/details cũ.
- Menu chọn một dùng phím mũi tên/Home/End/typeahead từ Radix. Khi menu mở, phần trang bên ngoài tạm `inert` và được khôi phục khi đóng để các điều khiển đang ẩn khỏi trình đọc màn hình cũng không nhận focus. Menu chọn nhiều dùng Tab/Space và mô tả đầy đủ các lựa chọn qua `aria-describedby`.
- Build production, ESLint, TypeScript đạt. 16 kịch bản Chromium đạt, gồm tìm kiếm/lọc hiện có và kiểm tra mới: viền xanh khi có giá trị, xóa từng tiêu chí, giữ keyword/city, Back/reload, menu tùy chỉnh và trạng thái tìm ngành rỗng, focus/bàn phím, axe khi menu mở. Kiểm tra responsive 360/390/768/1024/1440px; kiểm tra menu mở tại 360 và 1440px.
- Kiểm tra trực tiếp cổng 3000 trên desktop và mobile: bốn bộ lọc có giá trị, địa điểm đã chọn trên navbar, kết quả đúng và không có lỗi JavaScript. Đã xem ảnh menu và trạng thái chọn; tại 360px, mỗi bộ lọc rộng 140px, xếp hai cột. Bộ kiểm tra bổ sung kiểm soát chiều rộng tối thiểu để tránh ô chọn co thành một hàng quá nhỏ.
- Chưa kiểm tra trình đọc màn hình thật, Safari/Firefox hoặc backend Laravel thật. Không phát sinh ô chọn ngày mới trong thay đổi này.

## Khắc phục lệch trang khi mở bộ lọc

Trên desktop, `html` đã giữ sẵn khoảng thanh cuộn bằng `scrollbar-gutter: stable`, còn Radix Select tiếp tục thêm `margin-right` vào body khi khóa cuộn. Các bản sửa trước chỉ bao phủ dialog, notification và employer, bỏ sót Select trên trang việc làm.

CSS chung trong `site.css` đặt `html body[data-scroll-locked] { margin-right: 0 !important; }` tại breakpoint từ 901px, có kiểm tra hỗ trợ `scrollbar-gutter`. Selector đủ ưu tiên để thắng style được Radix chèn sau. Giữ nguyên khóa cuộn, focus trap, inert và cơ chế bù scrollbar của màn hình từ 900px trở xuống.

Regression `filter-layout.spec.ts` đo vị trí/chiều rộng header, tiêu đề, bộ lọc, kết quả và footer qua từng frame mở/đóng. Bao phủ bộ lọc một lựa chọn, sắp xếp, nhiều ngành và tìm địa điểm; trang dài/ngắn, các mốc 360/900/901/1440px. Khi Chromium headless không báo chiều rộng scrollbar native, test giả lập metric `clientWidth` của scrollbar cổ điển để thực sự kích hoạt khoảng bù khác 0. Đã xác nhận test thất bại trước sửa với độ lệch 17px, đạt sau sửa; không thay đổi scroll lock để né lỗi.

Kiểm chứng: production build/TypeScript và lint đạt; 24 E2E cho hình học dropdown, bộ lọc, sắp xếp, navbar và account layout đều đạt.

## Xóa dải trắng ở mép phải khi khóa cuộn

Khoảng `scrollbar-gutter` vẫn hiện nền trang khi scrollbar bị ẩn. Khi Radix khóa cuộn trên desktop, thay khoảng này bằng padding body có cùng kích thước; nền header, tiêu đề, hero và footer phủ kín phần padding. Nội dung giữ nguyên chiều rộng, overlay vẫn phủ toàn màn hình. `ScrollbarLayout` đo khoảng scrollbar lúc chưa khóa, theo dõi thay đổi kích thước và đo độc lập nếu đổi breakpoint trong lúc menu đang mở. Không thay đổi cơ chế khóa cuộn hoặc focus của Radix.

Regression `gutter-paint.spec.ts` đối chiếu pixel ở mép nội dung với toàn bộ dải mép phải tại 901/1440px trên trang việc làm, tài khoản, nhà tuyển dụng và trang chủ. Kiểm tra thêm mở menu ở 900px rồi tăng cửa sổ lên desktop; giữ các bài kiểm tra vị trí từng frame, bàn phím, navbar và sidebar hiện có.

Kiểm chứng: production build/TypeScript, lint và 29 E2E Chromium đạt. Đã xem ảnh mép phải trang việc làm: header, phần giới thiệu và nền nội dung phủ liền tới mép cửa sổ. Menu Select được chụp trong viewport hiện tại vì Radix chủ động đóng khi resize; ảnh toàn trang dùng dialog trang chủ để kiểm tra thêm footer.

## Giữ thanh cuộn cho ba bộ lọc việc làm

Theo yêu cầu đồng bộ với ô ngành nghề, hình thức làm việc, mức lương và cấp bậc chuyển sang Popover không modal. Tái sử dụng `SearchableSelectionField` với ô tìm kiếm tùy chọn; ba bộ lọc ngắn không hiện tìm kiếm. Giữ một lựa chọn, mục bỏ lọc, nút xóa riêng, hidden input và cập nhật URL như cũ. Menu hỗ trợ mũi tên, Home/End, gõ nhãn để di chuyển, Enter/Space để chọn, Escape và trả focus.

Không áp dụng khóa cuộn hoặc inert cho ba Popover này. Các Select ở trang tài khoản, nhà tuyển dụng và sắp xếp tiếp tục giữ hành vi hiện tại. Kiểm tra hồi quy xác nhận ba bộ lọc không khóa body và cuộn chuột ngoài menu vẫn cuộn trang tại 360/1440px; kiểm tra bố cục qua từng frame vẫn bao phủ 360/900/901/1440px, trang ngắn/dài.

Kiểm chứng: build/TypeScript, lint và 20 E2E đạt, gồm bàn phím, axe, URL, xóa bộ lọc, cuộn trang, hình học mở/đóng và màu mép trang của các overlay còn dùng scroll lock. Đã xem ảnh dropdown mới tại 1440px.
