const AUTH_SCREENS = new Set(["/login", "/register"]);

export const getSafeRedirect = (from: string | null | undefined): string | null => {
  if (!from) return null;

  if (!from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return null;
  if (AUTH_SCREENS.has(from)) return null;
  return from;
};
