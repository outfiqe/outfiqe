import { isNavItemActive } from "./isNavItemActive";
import type { SidebarNavItem, SidebarNavSection } from "./types";

const collectTrail = (
  navItems: readonly SidebarNavItem[],
  pathname: string,
  isActive: ((href: string, pathname: string) => boolean) | undefined,
  trail: Set<string>,
): boolean => {
  let containsActive = false;

  for (const { href, items, id } of navItems) {
    const ownActive = isNavItemActive(href, pathname, isActive);
    const childActive = items ? collectTrail(items, pathname, isActive, trail) : false;

    if (ownActive || childActive) {
      trail.add(id);
      containsActive = true;
    }
  }

  return containsActive;
};

export const getActiveTrailIds = (
  sections: readonly SidebarNavSection[],
  pathname: string,
  isActive?: (href: string, pathname: string) => boolean,
): ReadonlySet<string> => {
  const trail = new Set<string>();
  for (const section of sections) {
    collectTrail(section.items, pathname, isActive, trail);
  }
  return trail;
};
