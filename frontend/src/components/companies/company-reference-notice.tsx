import type { Company } from "@/features/jobs/types";
import { companyWebsite } from "@/features/companies/query";
import { Info } from "lucide-react";

export function CompanyReferenceNotice({ company }: { company: Company }) {
  if (!company.is_demo) return null;
  const source = companyWebsite(company.reference_sources?.profile_url ?? null);
  return (
    <aside
      className="company-reference-notice"
      aria-label="Thông tin về dữ liệu minh họa"
    >
      <Info size={18} aria-hidden="true" />
      <p>
        <strong>Hồ sơ doanh nghiệp tham khảo.</strong> Tên, hình nhận diện và
        giới thiệu được tổng hợp từ nguồn công khai. Tài khoản, tin tuyển dụng
        và hoạt động ứng tuyển trên trang này là dữ liệu minh họa, không do
        doanh nghiệp đăng hoặc xác nhận.
        {source && (
          <>
            {" "}
            <a href={source.href} target="_blank" rel="noopener noreferrer">
              Xem nguồn chính thức
            </a>
            .
          </>
        )}
      </p>
    </aside>
  );
}
