const publicReads = /^\/(?:categories(?:\/\d+)?|skills(?:\/\d+)?|companies(?:\/\d+)?|jobs(?:\/\d+)?|locations\/cities)$/;
const routes: [RegExp, string[]][] = [
  [publicReads, ["GET"]],
  [/^\/candidate\/profile$/, ["GET", "POST", "PUT"]],
  [/^\/candidate\/cv$/, ["GET", "POST", "DELETE"]],
  [/^\/candidate\/cv\/file$/, ["GET"]],
  [/^\/candidate\/avatar$/, ["POST", "DELETE"]],
  [/^\/candidate\/(?:saved-jobs|applications)$/, ["GET"]],
  [/^\/candidate\/applications\/\d+\/withdraw$/, ["DELETE"]],
  [/^\/jobs\/\d+\/(?:apply|report)$/, ["POST"]],
  [/^\/jobs\/\d+\/save$/, ["POST", "DELETE"]],
  [/^\/applications\/\d+\/cv$/, ["GET"]],
  [/^\/employer\/company$/, ["GET", "POST"]],
  [/^\/employer\/(?:my-jobs|applications)$/, ["GET"]],
  [/^\/employer\/jobs$/, ["POST"]],
  [/^\/employer\/jobs\/\d+$/, ["PUT"]],
  [/^\/employer\/jobs\/\d+\/status$/, ["PATCH"]],
  [/^\/employer\/jobs\/\d+\/applications$/, ["GET"]],
  [/^\/employer\/applications\/\d+$/, ["GET"]],
  [/^\/employer\/applications\/\d+\/status$/, ["PATCH"]],
  [/^\/conversations$/, ["GET", "POST"]],
  [/^\/conversations\/\d+\/messages$/, ["GET", "POST"]],
  [/^\/conversations\/\d+\/messages\/\d+\/image$/, ["GET"]],
  [/^\/conversations\/\d+\/read$/, ["PATCH"]],
  [/^\/notifications$/, ["GET"]],
  [/^\/notifications\/(?:\d+\/read|read-all)$/, ["PATCH"]],
  [/^\/notifications\/\d+$/, ["DELETE"]],
  [/^\/admin\/stats$/, ["GET"]],
  [/^\/admin\/users(?:\/\d+)?$/, ["GET"]],
  [/^\/admin\/users\/\d+\/(?:status|toggle-lock)$/, ["PATCH"]],
  [/^\/admin\/jobs(?:\/(?:\d+|reported))?$/, ["GET"]],
  [/^\/admin\/jobs\/\d+$/, ["DELETE"]],
  [/^\/admin\/jobs\/\d+\/report$/, ["PATCH"]],
  [/^\/admin\/(?:categories|skills)$/, ["GET", "POST"]],
  [/^\/admin\/(?:categories|skills)\/\d+$/, ["PUT", "DELETE"]],
  [/^\/broadcasting\/auth$/, ["POST"]],
];

export function allowedBackendPath(path: string, method = "GET"): boolean {
  if (path.length > 6000 || /[\\#\x00-\x20]/.test(path)) return false;
  const [pathname] = path.split("?");
  return routes.some(([pattern, methods]) => pattern.test(pathname) && methods.includes(method));
}

export const isPublicBackendRead = (path: string) => publicReads.test(path.split("?")[0]);

export const protectedFilePath = (path: string) =>
  /^\/(?:candidate\/cv\/file|applications\/\d+\/cv|conversations\/\d+\/messages\/\d+\/image)$/.test(path.split("?")[0]);
