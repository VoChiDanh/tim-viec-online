import type { AuthUser } from "@/features/auth/types";

export type AuthApiKind =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "logout"
  | "user"
  | "change-password";

export type AuthApiPath =
  | "/login"
  | "/register"
  | "/forgot-password"
  | "/reset-password"
  | "/logout"
  | "/user"
  | "/user/change-password";

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidResponse(): never {
  throw new AuthApiError(
    502,
    "invalid_response",
    "Dịch vụ xác thực trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.",
  );
}

export function parseUser(value: unknown): AuthUser {
  if (!record(value)) return invalidResponse();
  const { id, name, email, role, status } = value;
  if (
    !Number.isSafeInteger(id) ||
    Number(id) <= 0 ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 255 ||
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof role !== "string" ||
    !["candidate", "employer", "admin"].includes(role) ||
    typeof status !== "string" ||
    !["active", "locked"].includes(status)
  )
    return invalidResponse();
  return {
    id: id as number,
    name,
    email,
    role: role as AuthUser["role"],
    status: status as AuthUser["status"],
  };
}

export function parseLogin(value: unknown): {
  token: string;
  expires_at?: string;
} {
  if (!record(value)) return invalidResponse();
  const token = value.access_token ?? value.token;
  if (
    typeof token !== "string" ||
    !token.trim() ||
    token.length > 2000 ||
    /[\s\x00-\x1f\x7f]/.test(token)
  ) {
    return invalidResponse();
  }
  if (value.expires_at !== undefined) {
    const expiration = value.expires_at;
    if (
      typeof expiration !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(
        expiration,
      ) ||
      !Number.isFinite(Date.parse(expiration)) ||
      Date.parse(expiration) <= Date.now()
    )
      return invalidResponse();
    return { token, expires_at: expiration };
  }
  return { token };
}

const allowedFields: Record<AuthApiKind, readonly string[]> = {
  login: ["email", "password"],
  register: [
    "name",
    "email",
    "password",
    "password_confirmation",
    "role",
    "phone",
    "dob",
  ],
  "forgot-password": ["email"],
  "reset-password": ["email", "token", "password", "password_confirmation"],
  logout: [],
  user: [],
  "change-password": ["current_password", "password", "password_confirmation"],
};

export function mapAuthApiError(
  status: number,
  body: unknown,
  kind: AuthApiKind,
): AuthApiError {
  const code =
    record(body) && typeof body.code === "string" ? body.code : undefined;
  if (
    status === 400 &&
    kind === "reset-password" &&
    code === "invalid_reset_token"
  ) {
    return new AuthApiError(
      400,
      "invalid_reset_token",
      "Liên kết xác thực đã hết hạn hoặc không hợp lệ",
    );
  }
  if (
    status === 400 &&
    kind === "change-password" &&
    code === "invalid_current_password"
  ) {
    return new AuthApiError(
      400,
      "invalid_current_password",
      "Mật khẩu hiện tại không chính xác",
      { current_password: ["Mật khẩu hiện tại không chính xác"] },
    );
  }
  if (
    status === 400 &&
    kind === "change-password" &&
    code === "password_unchanged"
  ) {
    return new AuthApiError(
      400,
      "password_unchanged",
      "Mật khẩu mới không được trùng với mật khẩu hiện tại",
      { password: ["Mật khẩu mới không được trùng với mật khẩu hiện tại"] },
    );
  }
  if (status === 401)
    return new AuthApiError(
      401,
      "unauthorized",
      kind === "login"
        ? "Email hoặc mật khẩu không chính xác"
        : "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
  if (status === 403 && code === "account_locked")
    return new AuthApiError(
      403,
      "account_locked",
      "Tài khoản của bạn đã bị khóa bởi quản trị viên",
    );
  if (status === 403 && code === "temporarily_locked")
    return new AuthApiError(
      403,
      "temporarily_locked",
      "Tài khoản bị tạm khóa do nhập sai nhiều lần, vui lòng khôi phục tài khoản",
    );
  if (status === 403)
    return new AuthApiError(
      403,
      "forbidden",
      "Bạn không có quyền thực hiện thao tác này hoặc tài khoản đã bị khóa.",
    );
  if (status === 419)
    return new AuthApiError(
      419,
      "session_expired",
      "Phiên làm việc đã hết hạn. Vui lòng tải lại trang.",
    );
  if (status === 429)
    return new AuthApiError(
      429,
      "rate_limited",
      "Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.",
    );
  if (status === 422) {
    const errors = record(body) && record(body.errors) ? body.errors : {};
    const fieldErrors: Record<string, string[]> = {};
    for (const field of allowedFields[kind]) {
      if (Object.hasOwn(errors, field)) {
        fieldErrors[field] = [
          field.includes("password")
            ? "Mật khẩu không hợp lệ. Vui lòng kiểm tra lại."
            : "Thông tin không hợp lệ. Vui lòng kiểm tra lại.",
        ];
      }
    }
    if (
      kind === "register" &&
      (Object.hasOwn(errors, "email") ||
        (record(body) && body.code === "email_taken"))
    ) {
      fieldErrors.email = ["Email đã được sử dụng"];
    }
    return new AuthApiError(
      422,
      "validation_failed",
      "Vui lòng kiểm tra lại thông tin đã nhập.",
      fieldErrors,
    );
  }
  if (status === 404 || status === 405 || status === 501) {
    return new AuthApiError(
      503,
      "not_available",
      "Dịch vụ xác thực chưa sẵn sàng. Vui lòng thử lại sau.",
    );
  }
  return new AuthApiError(
    503,
    "service_unavailable",
    "Không thể kết nối dịch vụ xác thực. Vui lòng thử lại sau.",
  );
}
