const AUTH_SCREENS = new Set(["/login", "/register"]);

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin";

export const isAdminAppTarget = (target: string): boolean =>
  target === ADMIN_URL || target.startsWith(`${ADMIN_URL}/`);

export const getSafeRedirect = (from: string | null | undefined): string | null => {
  if (!from) return null;

  if (from === ADMIN_URL) return from;

  if (!from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return null;
  if (AUTH_SCREENS.has(from)) return null;
  return from;
};

export const resolveLoginDestination = (
  requestedRedirect: string | null,
  fallbackRoute: string,
  onTenantHost: boolean,
): string => {
  if (requestedRedirect === null) return fallbackRoute;
  if (isAdminAppTarget(requestedRedirect) && !onTenantHost) return fallbackRoute;
  return requestedRedirect;
};
