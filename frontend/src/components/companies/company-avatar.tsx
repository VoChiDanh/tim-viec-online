import type { CompanyProfile } from "@/features/companies/types";

export function CompanyAvatar({
  company,
  large = false,
}: {
  company: Pick<CompanyProfile, "mark" | "brand">;
  large?: boolean;
}) {
  return (
    <span
      className={`company-avatar${large ? " company-avatar--large" : ""}`}
      data-brand={company.brand}
      aria-hidden="true"
    >
      <span>{company.mark}</span>
    </span>
  );
}
