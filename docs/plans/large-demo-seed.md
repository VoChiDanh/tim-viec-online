# Bộ seed dữ liệu tuyển dụng quy mô lớn

Phạm vi đã chốt: 1.500 ứng viên, 120 công ty, 1.440 tin, 22.500 đơn; lưu dữ liệu tổng hợp tiếng Việt, không dùng dữ liệu cá nhân thật. Đối chiếu `docs/SRS.md`, `db/tim_viec_online.sql` và migrations hiện hành (nguồn thực thi).

## Thiết kế

- Lệnh `demo:seed` riêng, không thay seed mặc định và không tự migrate/reset database. Chỉ chạy local/testing. Có dry-run, preset nhỏ/vừa/lớn/rất lớn, tham số AI/runtime độc lập.
- Thêm migration `demo_seed_runs` lưu dấu bộ seed, cấu hình và thống kê. Chạy lại cùng bộ là no-op; cấu hình khác bị từ chối, không ghi đè tài khoản hoặc dữ liệu đã sửa. Transaction + khóa database chặn hai lượt cùng lúc.
- Dữ liệu nghiệp vụ: users, candidate_profiles, companies, categories, skills, candidate_skills, jobs, job_skills, saved_jobs, applications, conversations, messages, notifications, job_reports. Quan hệ đúng ownership và thời gian, hồ sơ đã rút chưa reviewed, hạn tin đóng/expired đúng trạng thái.
- AI vẫn tắt. `--with-ai-fixtures` tạo bản ghi `ai_cv_analyses` **ghi rõ minh họa**, không gọi model hoặc giả làm kết quả thật. Không cho ứng viên xem AI.
- `--with-runtime` thêm fixtures session/token/cache/queue. Token và reset secret ngẫu nhiên chỉ lưu hash, đã hết hạn; queue riêng chỉ chứa job no-op, không email/AI. Bảng migrations do Laravel tự quản lý, không fake.
- Assets riêng trong `demo-seed/{run}/`: CV PDF thật (text Latin chuyển tự để không phụ thuộc font ngoài), ảnh avatar/logo/chat PNG local. CV hồ sơ và bản đã nộp khác đường dẫn, không dùng dữ liệu CV thật trong repo.
- Catalog tiếng Việt theo ngành nghề và kỹ năng; doanh nghiệp hư cấu; job có JD/yêu cầu/quyền lợi có nội dung theo ngành; ứng viên 3–10 kỹ năng đúng ngành; job salary đủ 3 kiểu; các trạng thái và thời điểm trải 6 tháng.

## Thực hiện và kiểm tra

- [x] Regression test preset/count, idempotency, không sửa dữ liệu ngoài seed, ownership và thời gian, assets, role/private CV, không có side effects.
- [x] Catalog, cấu hình preset, sinh PDF/PNG, pipeline batch insert theo quan hệ.
- [x] Runtime/AI opt-in, command dry-run và report, guard môi trường/mật khẩu.
- [x] Chạy trên DB riêng: test nhỏ rồi full large, đếm và kiểm tra SQL invariants, smoke API.
- [x] Tài liệu lệnh/tài khoản/số liệu; commit thường xuyên, không tự push/merge hoặc chạy DB phát triển.

## Kết quả kiểm chứng

Backend regression: 63 tests, 369 assertions đạt; Pint và git diff --check đạt.

Ngày 26/10/2026, preset large + AI/runtime fixtures chạy trên database MariaDB và storage riêng: 118,75 giây, PHP peak 58 MB. Có dữ liệu ở cả 25 bảng (bao gồm migrations do Laravel quản lý). Kiểm tra 25.620 file CV/avatar/logo không thiếu file; các kiểm tra thời gian nộp, ownership hội thoại, sender, last_message_at, report flags, token hết hạn và queue riêng đều đạt. API jobs, companies, candidate applications, employer applications và admin stats trả 200; API ứng viên không chứa match_score. Chạy lại cùng cấu hình là no-op khoảng 0,01 giây. Hướng dẫn sử dụng tại [demo-data.md](../demo-data.md).
