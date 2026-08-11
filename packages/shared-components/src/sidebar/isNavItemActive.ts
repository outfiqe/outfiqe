export const isNavItemActive = (
  href: string,
  pathname: string,
  isActive?: (href: string, pathname: string) => boolean,
): boolean => {
  if (isActive) return isActive(href, pathname);
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};
