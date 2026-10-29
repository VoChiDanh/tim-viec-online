"use client";

import { useState } from "react";
import Image from "next/image";
import type { EmployerCompany } from "@/features/employer/types";

export function CompanyLogo({
  company,
}: {
  company: Pick<EmployerCompany, "name" | "logo">;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = company.logo;

  return (
    <span className="ep-company-logo" aria-hidden="true">
      {source && failedSource !== source ? (
        <Image
          key={source}
          src={source}
          alt=""
          width={44}
          height={44}
          unoptimized
          onError={() => setFailedSource(source)}
        />
      ) : (
        company.name.slice(0, 3).toUpperCase()
      )}
    </span>
  );
}
