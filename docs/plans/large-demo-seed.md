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

- [ ] Regression test preset/count, idempotency, không sửa dữ liệu ngoài seed, ownership và thời gian, assets, role/private CV, không có side effects.
- [ ] Catalog, cấu hình preset, sinh PDF/PNG, pipeline batch insert theo quan hệ.
- [ ] Runtime/AI opt-in, command dry-run và report, guard môi trường/mật khẩu.
- [ ] Chạy trên DB riêng: test nhỏ rồi full large, đếm và kiểm tra SQL invariants, smoke API.
- [ ] Tài liệu lệnh/tài khoản/số liệu; commit thường xuyên, không tự push/merge hoặc chạy DB phát triển.
