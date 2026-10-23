// Allow only known internal destinations. Never trust a URL supplied by a form.
export function safeJobReturnPath(
  value: string | string[] | undefined,
  role?: "candidate" | "employer" | "admin",
): string {
  const fallback =
    role === "employer" ? "/employer" : role === "admin" ? "/admin" : "/jobs";
  if (
    typeof value !== "string" ||
    value.length > 1000 ||
    /[\x00-\x1f\x7f\\]/.test(value) ||
    !/^\/(?:jobs(?:\/\d+)?|account\/(?:profile|jobs|messages|notifications|settings|security)|employer(?:\/(?:jobs(?:\/new|\/[1-9]\d*\/edit)?|candidates(?:\/[1-9]\d*)?|messages|notifications|company))?)(?:\?[^#]*)?$/.test(
      value,
    )
  )
    return fallback;
  const pathname = value.split("?", 1)[0];
  // Account security is shared by all roles. Other protected return paths must
  // agree with the verified session role to avoid redirect loops after login.
  if (pathname === "/account/security") return value;
  if (role === "admin") return fallback;
  const employerPath =
    pathname === "/employer" || pathname.startsWith("/employer/");
  if (
    (role === "candidate" && employerPath) ||
    (role === "employer" && !employerPath)
  )
    return fallback;
  return value;
}
