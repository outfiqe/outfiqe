const AUTH_SCREENS = new Set(["/login", "/register"]);

// The only external redirect target we ever allow — everything else must be
// a same-app relative path. Admins land here straight out of login instead
// of getting a second, duplicated login form inside apps/admin.
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173";

export const getSafeRedirect = (from: string | null | undefined): string | null => {
  if (!from) return null;

  if (from === ADMIN_URL) return from;

  if (!from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return null;
  if (AUTH_SCREENS.has(from)) return null;
  return from;
};
