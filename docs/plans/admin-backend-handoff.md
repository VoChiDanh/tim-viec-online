# Handoff admin frontend cho backend

## Kết luận rà soát

Trước refactor, read factory còn nằm trực tiếp trong route và các màn hình tự sửa mảng bằng `setDb`. Chỉ thay fixture bằng API sẽ không đủ: thao tác lưu/xóa có thể vẫn báo thành công dù request thất bại. Hiện đã tách theo cùng hướng service/provider của candidate và employer, đồng thời chuẩn bị mutation bất đồng bộ.

| Lớp | File | Trách nhiệm |
| --- | --- | --- |
| Đọc có xác thực | `frontend/src/services/admin.ts` | `getAdminData`, `getAdminJob`; kiểm tra role server; cache theo render, không cache tài khoản giữa người dùng |
| Dữ liệu mẫu | `frontend/src/mocks/admin.ts` | Factory trả bản sao độc lập; chỉ service mock gọi; không chứa trong module formatters client |
| Hợp đồng thao tác | `frontend/src/features/admin/adapter.ts` | `AdminCommand`, success/failure và `AdminWorkspaceAdapter.execute` trả Promise |
| Ghi dữ liệu mẫu | `frontend/src/mocks/admin-adapter.ts` | Kiểm tra mới nhất, cập nhật immutable, cascade những quan hệ có trong fixture |
| Trạng thái UI | `frontend/src/components/admin/admin-provider.tsx` | Adapter duy nhất, pending, chống gửi trùng, chỉ đổi snapshot khi thành công, lỗi mạng an toàn |
| Hiển thị | `frontend/src/features/admin/formatters.ts`, components admin | Không import fixture hoặc tự sinh ID/cascade; gọi `execute` và đợi kết quả trước khi đóng dialog/toast thành công |

`AdminDatabase` là projection cho workspace mẫu (danh sách, biểu đồ và các quan hệ cần hiển thị), **không phải yêu cầu backend trả toàn bộ database**, password/token/CV hoặc quan hệ nhạy cảm trong một endpoint. Các phép tìm/lọc/phân trang client hiện phù hợp fixture nhỏ; khi triển khai dữ liệu thật cần query service theo trang và DTO summary riêng, không tải mọi người dùng về client.

## Đối chiếu SRS và SQL

- FR-04.5, FR-09.1: tin mới `active`; kiểm tra báo cáo qua `is_reported`. Không tự thêm `pending/approve/reject` từ bảng tổng quan cũ của README.
- FR-09.2, FR-04.6: xóa tin cần `id`, lý do 1–255 ký tự và xác nhận ảnh hưởng. Mock xóa tin + applications có trong fixture. Backend phải thực hiện transaction toàn bộ FK liên quan, thông báo nhà tuyển dụng và lưu lý do/audit theo hợp đồng được thống nhất. Mock không tuyên bố đã xóa hội thoại thật hoặc gửi thông báo thật.
- FR-09.4, FR-02.5: đổi `active/locked` độc lập với tin tuyển dụng. Backend phải kiểm tra quyền và thu hồi phiên ngay khi khóa; frontend không thể thực thi việc này qua sửa mảng. Bản mẫu bảo vệ các tài khoản admin; đây là quyết định an toàn của demo, không phải quyền mới trong SRS.
- FR-09.5: danh mục ngành nghề tối đa 150 ký tự, kỹ năng 100 theo SQL; tên được trim, chuẩn hóa khoảng trắng, kiểm tra trùng. `jobs.category_id` RESTRICT: không xóa ngành đang dùng. Xóa skill gỡ pivot theo FK; mock mô phỏng job skills, `candidates_count` chỉ là projection số liệu chứ không có hồ sơ/pivot ứng viên thật để sửa.
- Không thêm chức năng AI vào UI ứng viên; không thay đổi bảng dữ liệu hay xây backend trong phần việc này.

## Khi backend admin sẵn sàng

1. Thống nhất endpoint và Resource DTO với nhóm backend. Hiện `backend/routes/api.php` chỉ có `/user`; tài liệu này không coi đường dẫn dự kiến là API đang hoạt động.
2. Thay nhánh API `getAdminData/getAdminJob` bằng service thật, sử dụng session/token server giống auth/employer. Validate DTO whitelist trước khi trả client; loại trường nhạy cảm. Với pagination, detail phải gọi API theo ID độc lập, không quyết định 404 từ một trang danh sách.
3. Thay factory adapter tại provider bằng adapter API hoặc wrapper gọi Server Actions. UI đã `await execute(command)`, nên không phải viết lại handler lưu/xóa/khóa. Token chỉ ở server/httpOnly cookie, không truyền vào client hoặc localStorage. Mỗi Server Action kiểm tra origin, session và role; Laravel Policy/FormRequest vẫn là nguồn phân quyền/validate cuối cùng.
4. Adapter chuyển `{success,message,data,meta}` của Laravel thành projection UI, chỉ trả success sau khi backend xác nhận. Cập nhật/refetch dashboard, badge và danh sách liên quan sau mutation. Không mô phỏng sinh ID, xóa cascade hoặc thu hồi session ở API adapter.
5. Ánh xạ lỗi: `401` hết phiên → luồng đăng nhập; `403` không có quyền/đã khóa; `404` bản ghi không còn; `409` xung đột/đang sử dụng; `422` lỗi field (`name`, `reason`); mạng/`5xx` → lỗi an toàn, giữ dialog và giá trị đang nhập. Không hiển thị trực tiếp stacktrace hoặc raw backend message chưa kiểm soát.
6. `reset()` của adapter hiện là tiện ích mock-only, **không ánh xạ thành DELETE/RESET API**. Khi mở API workspace cần ẩn nút/ghi chú mock, dùng nội dung success phù hợp, và thay query danh sách/tổng hợp sang server khi dữ liệu lớn. Đây là phần tích hợp thật còn cần làm, không phải chỉ đổi một biến môi trường.

Hiện `AUTH_MODE=api` tiếp tục hiển thị trạng thái chưa kết nối, không tự fallback fixture. Kiểm thử API fixture xác nhận route canonical/preview/query không lộ dữ liệu admin mẫu.

## Kiểm chứng refactor

- Build production/TypeScript và lint đạt; 73 unit test đạt. Bốn test mới gọi trực tiếp mock transaction/adapter thực tế: trùng tên, stale ID, bản sao độc lập, khóa admin bị chặn, xóa tin cần lý do/xác nhận, bảo toàn chủ tin và gỡ liên kết kỹ năng.
- 16 E2E admin đạt: CRUD/chuyển trang, dashboard/badge đồng bộ, quyền truy cập, motion/reduced motion, phân trang dùng chung, mobile/axe/focus và form giữ dữ liệu khi adapter từ chối tên trùng.
- 2 E2E admin với auth API fixture đạt: role từ server và không thay dữ liệu thật bằng fixture qua URL canonical/preview/query. Chưa có API quản trị thật để xác minh mutation transport, pagination server, thu hồi session hay thông báo realtime.
