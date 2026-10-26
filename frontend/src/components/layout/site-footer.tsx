import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-grid">
        <div className="footer-about">
          <Brand />
          <p>Tìm việc làm theo ngành nghề, địa điểm và mức lương.</p>
        </div>
        <nav aria-label="Việc làm theo ngành">
          <h2>Khám phá việc làm</h2>
          <Link href="/jobs">Tất cả việc làm</Link>
          <Link href="/#top-companies">Doanh nghiệp tuyển dụng</Link>
          <Link href="/jobs?category_ids=1">Công nghệ thông tin</Link>
          <Link href="/jobs?category_ids=2">Marketing & truyền thông</Link>
          <Link href="/jobs?category_ids=4">Thiết kế & sáng tạo</Link>
        </nav>
        <nav aria-label="Việc làm theo hình thức">
          <h2>Hình thức làm việc</h2>
          <Link href="/jobs?job_type=full_time">Toàn thời gian</Link>
          <Link href="/jobs?job_type=part_time">Bán thời gian</Link>
          <Link href="/jobs?job_type=remote">Làm việc từ xa</Link>
          <Link href="/jobs?job_type=internship">Cơ hội thực tập</Link>
        </nav>
        <nav aria-label="Tài khoản">
          <h2>Tài khoản</h2>
          <Link href="/login">
            Dành cho ứng viên <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <Link href="/login?role=employer">
            Dành cho nhà tuyển dụng{" "}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </nav>
      </div>
      <div className="site-container footer-bottom">
        © 2026 TimViecOnline · Cổng việc làm & tuyển dụng
      </div>
    </footer>
  );
}
