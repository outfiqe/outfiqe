export const PRIVATE_PATH_PREFIXES = [
  "/auth",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/dashboard",
  "/overview",
  "/profile",
  "/settings",
  "/orders",
  "/manage-orders",
  "/cart",
  "/checkout",
  "/wishlist",
  "/wallet",
  "/withdraw",
  "/earnings",
  "/payments",
  "/messages",
  "/badges",
  "/challenges",
  "/progress",
  "/share",
];

export const isPrivatePath = (pathname: string): boolean =>
  PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
