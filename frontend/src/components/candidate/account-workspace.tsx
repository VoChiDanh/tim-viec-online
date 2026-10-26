import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/services/auth-session";
import { WorkspaceContentSkeleton } from "./profile-skeleton";
import { WorkspaceFrame } from "./workspace-frame";
import type { CandidateSection } from "@/features/candidate-workspace/types";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Field, FieldLabel } from "@/modules/cores/shadcn/components/ui/field";
import { Button } from "@/modules/cores/shadcn/components/ui/button";
import { authMockEnabled } from "@/services/auth-mode";
import { getCandidatePreview } from "@/services/candidate-workspace";
import { MyJobs } from "./my-jobs";
import { CandidateMessages } from "./candidate-messages";
import { CandidateNotifications } from "./candidate-notifications";
import { AccountSettings } from "./account-settings";

const titles = {
  jobs: "Việc làm của tôi",
  messages: "Tin nhắn",
  notifications: "Thông báo của bạn",
  settings: "Quản lý tài khoản",
};
export function AccountWorkspace({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  return (
    <Suspense fallback={<WorkspaceContentSkeleton />}>
      <AccountContent params={params} />
    </Suspense>
  );
}
async function AccountContent({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(titles, section) && section !== "alerts") notFound();
  // Always revalidate the authenticated role close to private data access.
  const user = await requireUser("candidate", `/account/${section}`);
  if (section === "alerts") redirect("/account/notifications");
  if (authMockEnabled()) {
    await getCandidatePreview();
    if (section === "jobs") return <MyJobs />;
    if (section === "messages") return <CandidateMessages />;
    if (section === "notifications") return <CandidateNotifications />;
    return <AccountSettings />;
  }
  const title = titles[section as keyof typeof titles];
  return (
    <WorkspaceFrame
      section={section as CandidateSection}
      preview={false}
      name={user.name}
    >
      <div className="cu-card cu-title">
        <h1>{title}</h1>
      </div>
      {section === "settings" ? (
        <>
          <section className="cu-card">
            <h2>Thông tin tài khoản</h2>
            <div className="cu-form-grid">
              <Field>
                <FieldLabel htmlFor="real-account-name">Họ và tên</FieldLabel>
                <Input id="real-account-name" readOnly value={user.name} />
              </Field>
              <Field>
                <FieldLabel htmlFor="real-account-email">
                  Email đăng nhập
                </FieldLabel>
                <Input
                  id="real-account-email"
                  type="email"
                  readOnly
                  value={user.email}
                />
              </Field>
            </div>
            <Link className="cu-link" href="/account/profile">
              Cập nhật hồ sơ cá nhân
            </Link>
          </section>
          <section className="cu-card">
            <h2>Cài đặt thông báo qua email</h2>
            <p className="cu-muted">
              Cài đặt thông báo qua email hiện chưa khả dụng.
            </p>
          </section>
          <section className="cu-card">
            <h2>Thay đổi mật khẩu</h2>
            <p className="cu-muted">
              Xác thực mật khẩu hiện tại và chọn mật khẩu mới cho tài khoản.
            </p>
            <Button asChild>
              <Link href="/account/security">Đổi mật khẩu</Link>
            </Button>
          </section>
        </>
      ) : (
        <section className="cu-card cu-empty">
          <h2>{title} hiện chưa khả dụng</h2>
          <p>Chưa thể tải dữ liệu tài khoản. Vui lòng quay lại sau.</p>
          <Link href="/jobs" className="cu-link">
            Khám phá việc làm
          </Link>
        </section>
      )}
    </WorkspaceFrame>
  );
}
