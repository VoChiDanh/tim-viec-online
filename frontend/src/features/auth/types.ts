export type AuthKind = "login" | "register" | "forgot" | "reset" | "change";

export type AuthRole = "candidate" | "employer" | "admin";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: AuthRole;
  status: "active" | "locked";
};

export type AuthValues = Record<string, string>;
export type FieldErrors = Record<string, string>;

export type AuthActionState = {
  status: "idle" | "error" | "success" | "preview";
  message?: string;
  errors?: FieldErrors;
};

export const INITIAL_AUTH_STATE: AuthActionState = { status: "idle" };
