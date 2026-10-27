# Triển khai AI đối chiếu CV — FR-07

Phạm vi đã thống nhất trong SRS: xử lý CV PDF sau khi nộp đơn, đối chiếu JD, lưu đánh giá riêng cho nhà tuyển dụng sở hữu tin và admin. Không trả điểm/trạng thái/lỗi AI cho ứng viên, không tự quyết định tuyển hay loại.

## Thiết kế

- Dùng Groq theo cấu hình hiện có (`GROQ_MODEL`), hỗ trợ Gemini khi chọn rõ provider. Key chỉ ở backend.
- PDF văn bản tối đa 5 MB; nội dung trích xuất và JD có giới hạn. PDF scan không đọc được phải báo lỗi, không sinh điểm thay thế.
- Chấm bốn tiêu chí 0–100; backend tính tổng kỹ năng 40%, kinh nghiệm 30%, học vấn 15%, định hướng/ngôn ngữ 15%. Kiểm tra JSON, số nguyên, 2–4 điểm mạnh, tối đa 4 kỹ năng thiếu, nhận xét dưới 80 từ.
- Queue database riêng `ai`, tối đa ba lần cho lỗi tạm thời; khóa dùng database để ngăn xử lý trùng. Chụp JD và kỹ năng cho lần phân tích đầu tiên; giữ nguyên khi thử lại.
- Chỉ nộp đơn mới hoặc POST có quyền mới tạo tác vụ. GET không gọi lại AI; không phân tích hàng loạt dữ liệu demo.
- GET/POST AI trả trạng thái thống nhất `{status, analysis, error, retryable}`. Trạng thái gồm deferred/pending/processing/completed/failed.
- Giao diện nhà tuyển dụng dùng dữ liệu thật, skeleton khi chờ, xem kết quả và thử lại khi lỗi; chỉ polling hồ sơ đang mở, có giới hạn.

## Kiểm chứng

1. Kiểm thử provider với PDF thật và HTTP giả: cấu trúc, trọng số, giới hạn đầu vào, lỗi/quota, không lưu nội dung lỗi nhạy cảm.
2. Kiểm thử quyền sở hữu, không lộ AI cho ứng viên, queue tách riêng, trùng tác vụ, thử lại và đọc không gây chi phí.
3. Kiểm thử mapping/frontend và trình duyệt cho kết quả, chờ, lỗi, lọc/sắp xếp.
4. Chạy bộ kiểm thử backend/frontend và build; thử một yêu cầu thật với CV tổng hợp, không gửi CV cá nhân để kiểm tra cấu hình.

Migration bổ sung cột nullable, giữ dữ liệu hiện tại. Không reset database, không seed lại.

## Kết quả kiểm chứng — 27/10/2026

- [x] Backend: 165 kiểm thử / 1.692 assertions đạt; nhóm AI cuối cùng 46 kiểm thử / 300 assertions đạt.
- [x] Frontend: 120 unit tests đạt, build production và lint các file TypeScript thay đổi đạt.
- [x] Trình duyệt: 4 kiểm thử AI (nhà tuyển dụng/admin/candidate, retry và hồ sơ kẹt, mobile/axe), 28 xác thực, 14 tích hợp Laravel đạt.
- [x] Kiểm tra hình ảnh màn hình desktop và mobile; ảnh/traces trong `frontend/test-results/`, không commit.
- [x] Groq thật `openai/gpt-oss-20b`: CV tổng hợp qua database queue lưu kết quả thành công, 1,12 giây và 1.031 token. Đây là kiểm tra kết nối, không đại diện độ chính xác hay thời gian trung bình.
- [x] Database local đã chạy riêng hai migration AI; bật `AI_ANALYSIS_ENABLED=true`, `AI_PROVIDER=groq` và worker `database --queue=ai`. `.env` không commit.

Chưa benchmark chất lượng trên tập CV gán nhãn, tải đồng thời hoặc quota thực tế; không tự gửi dữ liệu CV demo/cá nhân hàng loạt. Kết quả đã lưu từ trước có thể thiếu metadata/điểm thành phần.
