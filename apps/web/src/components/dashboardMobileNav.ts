import type { SidebarNavItem } from "@outfiqe/components";

export const PINNED_SLOT_COUNT = 4;

export const SWIPE_DISMISS_DISTANCE_PX = 96;
export const SWIPE_DISMISS_VELOCITY = 600;

export const isCrossAppNavHref = (href: string): boolean =>
  href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/admin");

export const shouldDismissOnSwipe = (dragOffset: number, dragVelocity: number): boolean =>
  dragOffset > SWIPE_DISMISS_DISTANCE_PX || dragVelocity > SWIPE_DISMISS_VELOCITY;

export const resolvePinnedIds = (
  navItems: readonly SidebarNavItem[],
  pinnedIds: readonly string[] | null,
): string[] => {
  const eligibleIds = new Set(navItems.map((item) => item.id));
  const defaultIds = navItems.slice(0, PINNED_SLOT_COUNT).map((item) => item.id);

  const chosen = pinnedIds === null ? defaultIds : pinnedIds.filter((id) => eligibleIds.has(id));

  const resolved: string[] = [];
  for (const id of [...chosen, ...defaultIds]) {
    if (resolved.length === PINNED_SLOT_COUNT) break;
    if (!resolved.includes(id)) resolved.push(id);
  }
  return resolved;
};
