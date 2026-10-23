import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { AuthKind } from "@/features/auth/types";
import { validateAuthValues } from "@/features/auth/validation";
import { vietnamToday } from "@/features/jobs/formatters";
import { safeJobReturnPath } from "@/lib/return-path";
import { authEnabled, authMockEnabled } from "@/services/auth-mode";
import { getCurrentUser, roleLanding } from "@/services/auth-session";
import {
  changePasswordAction,
  forgotAction,
  loginAction,
  registerAction,
  resetAction,
} from "@/app/(auth)/actions";
import { AuthForm } from "./auth-form";
import { AuthShell } from "./auth-shell";

const content = {
  login: {
    title: "Đăng nhập",
    description: "Đăng nhập để tiếp tục sử dụng TimViecOnline.",
  },
  register: {
    title: "Tạo tài khoản",
    description: "Đăng ký tài khoản ứng viên hoặc nhà tuyển dụng.",
  },
  forgot: {
    title: "Quên mật khẩu?",
    description: "Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.",
  },
  reset: {
    title: "Đặt lại mật khẩu",
    description: "Chọn mật khẩu mới cho tài khoản của bạn.",
  },
  change: {
    title: "Đổi mật khẩu",
    description: "Cập nhật mật khẩu để tiếp tục sử dụng tài khoản.",
  },
};
type Params = Record<string, string | string[] | undefined>;
export async function AuthScreen({
  kind,
  searchParams,
}: {
  kind: AuthKind;
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  await connection();
  const role = params.role === "employer" ? "employer" : "candidate";
  const returnTo = safeJobReturnPath(params.returnTo);
  if (kind === "login" || kind === "register") {
    const user = await getCurrentUser();
    if (user) redirect(roleLanding(user.role, returnTo));
  }
  const token =
    typeof params.token === "string" && params.token.length <= 512
      ? params.token
      : "";
  const email =
    typeof params.email === "string" && params.email.length <= 100
      ? params.email
      : "";
  const resetLinkInvalid =
    !token || !!validateAuthValues("forgot", { email }, vietnamToday()).email;
  const actions = {
    login: loginAction.bind(null, returnTo),
    register: registerAction,
    forgot: forgotAction,
    reset: resetAction,
    change: changePasswordAction,
  };
  const notice =
    params.notice === "registered"
      ? "Đăng ký thành công. Vui lòng đăng nhập để tiếp tục."
      : params.notice === "reset"
        ? "Đặt lại mật khẩu thành công. Vui lòng đăng nhập."
        : params.notice === "logout"
          ? "Bạn đã đăng xuất."
          : "";
  return (
    <AuthShell kind={kind} {...content[kind]}>
      {notice && kind === "login" && authEnabled() && (
        <p className="auth-status auth-status-success" role="status">
          {notice}
        </p>
      )}
      {kind === "reset" && resetLinkInvalid ? (
        <div className="auth-status" role="alert">
          Liên kết xác thực đã hết hạn hoặc không hợp lệ.{" "}
          <Link href="/forgot-password">Yêu cầu liên kết mới</Link>
        </div>
      ) : (
        <AuthForm
          key={`${kind}-${role}`}
          kind={kind}
          preview={
            !authEnabled() ||
            (authMockEnabled() && kind !== "login" && kind !== "change")
          }
          today={vietnamToday()}
          role={role}
          email={email}
          token={token}
          returnTo={returnTo}
          action={actions[kind]}
        />
      )}
    </AuthShell>
  );
}
