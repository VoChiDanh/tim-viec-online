"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  AuthApiError,
  parseLogin,
  parseUser,
} from "@/features/auth/api-contract";
import type { AuthActionState, AuthKind } from "@/features/auth/types";
import { readAuthForm, validateAuthValues } from "@/features/auth/validation";
import { vietnamToday } from "@/features/jobs/formatters";
import { authEnabled } from "@/services/auth-mode";
import { authRequest } from "@/services/auth-request";
import {
  assertAuthOrigin,
  createSession,
  getCurrentUser,
  roleLanding,
  SESSION_COOKIE,
} from "@/services/auth-session";

function failure(error: unknown): AuthActionState {
  if (error instanceof AuthApiError)
    return {
      status: "error",
      message: Object.keys(error.fieldErrors).length
        ? "Vui lòng kiểm tra lại thông tin đã nhập."
        : error.message,
      errors: Object.fromEntries(
        Object.entries(error.fieldErrors).map(([key, values]) => [
          key,
          values[0],
        ]),
      ),
    };
  return {
    status: "error",
    message: "Chưa thực hiện được yêu cầu. Vui lòng thử lại sau.",
  };
}

async function validate(kind: AuthKind, form: FormData) {
  const values = readAuthForm(kind, form);
  const errors = validateAuthValues(kind, values, vietnamToday());
  if (Object.keys(errors).length)
    return {
      values,
      error: {
        status: "error",
        message: "Vui lòng kiểm tra lại thông tin đã nhập.",
        errors,
      } as AuthActionState,
    };
  if (!authEnabled())
    return {
      values,
      error: {
        status: "preview",
        message: "Hiện chưa thể thực hiện yêu cầu. Vui lòng thử lại sau.",
      } as AuthActionState,
    };
  await assertAuthOrigin();
  return { values, error: null };
}

export async function loginAction(
  returnTo: string,
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  let destination: string;
  let token: string | undefined;
  try {
    const { values, error } = await validate("login", form);
    if (error) return error;
    const remembered = form.get("remember") === "on";
    const login = parseLogin(
      await authRequest("/login", {
        body: { ...values, remember: remembered },
      }),
    );
    token = login.token;
    const user = parseUser(await authRequest("/user", { token }));
    if (user.status !== "active")
      throw new AuthApiError(
        403,
        "account_locked",
        "Tài khoản của bạn đã bị khóa bởi quản trị viên",
      );
    await createSession(token, remembered, login.expires_at);
    revalidatePath("/", "layout");
    destination = roleLanding(user.role, returnTo);
  } catch (error) {
    if (token) await authRequest("/logout", { token }).catch(() => undefined);
    return failure(error);
  }
  redirect(destination);
}

export async function registerAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  try {
    const { values, error } = await validate("register", form);
    if (error) return error;
    await authRequest("/register", { body: values });
  } catch (error) {
    return failure(error);
  }
  redirect("/login?notice=registered");
}

export async function forgotAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  try {
    const { values, error } = await validate("forgot", form);
    if (error) return error;
    await authRequest("/forgot-password", { body: values });
    return {
      status: "success",
      message:
        "Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến và thư rác.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function resetAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  try {
    const { values, error } = await validate("reset", form);
    if (error) return error;
    await authRequest("/reset-password", { body: values });
  } catch (error) {
    return failure(error);
  }
  redirect("/login?notice=reset");
}

export async function changePasswordAction(
  _previous: AuthActionState,
  form: FormData,
): Promise<AuthActionState> {
  try {
    const { values, error } = await validate("change", form);
    if (error) return error;
    const user = await getCurrentUser();
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!user || !token)
      throw new AuthApiError(
        401,
        "unauthorized",
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      );
    await authRequest("/user/change-password", {
      method: "PUT",
      body: values,
      token,
    });
    return { status: "success", message: "Đổi mật khẩu thành công." };
  } catch (error) {
    return failure(error);
  }
}

export async function logoutAction() {
  if (authEnabled()) await assertAuthOrigin();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && authEnabled())
    await authRequest("/logout", { token }).catch(() => undefined);
  jar.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login?notice=logout");
}
