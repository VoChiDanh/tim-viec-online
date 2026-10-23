import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { FileUser } from "lucide-react";
import { getCandidateProfileAccount } from "@/services/candidate-profile";
import { WorkspaceContentSkeleton } from "@/components/candidate/profile-skeleton";
import { WorkspaceFrame } from "@/components/candidate/workspace-frame";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { ProfileEditor } from "@/components/candidate/profile-editor";
import { authMockEnabled } from "@/services/auth-mode";
import { getCandidatePreview } from "@/services/candidate-workspace";
import { getProvinceNames } from "@/services/locations";
import { vietnamToday } from "@/features/jobs/formatters";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi",
  robots: { index: false },
};
export default function AccountProfilePage() {
  return (
    <Suspense fallback={<WorkspaceContentSkeleton />}>
      <AccountProfile />
    </Suspense>
  );
}
async function AccountProfile() {
  const { user } = await getCandidateProfileAccount();
  if (authMockEnabled()) {
    const [initial, cities] = await Promise.all([
      getCandidatePreview(),
      getProvinceNames(),
    ]);
    return (
      <ProfileEditor
        initial={initial.profile}
        cities={cities}
        today={vietnamToday()}
      />
    );
  }
  return (
    <WorkspaceFrame section="profile" preview={false} name={user.name}>
      <section className="cu-card cu-empty">
        <FileUser aria-hidden="true" size={40} />
        <h1>Hồ sơ của {user.name}</h1>
        <p>Hồ sơ hiện chưa khả dụng. Vui lòng quay lại sau.</p>
        <Button asChild>
          <Link href="/jobs">Khám phá việc làm</Link>
        </Button>
      </section>
    </WorkspaceFrame>
  );
}
