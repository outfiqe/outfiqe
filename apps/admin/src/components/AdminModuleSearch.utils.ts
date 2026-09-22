import type { SidebarIcon, SidebarNavItem, SidebarNavSection } from "@outfiqe/components";

export type AdminModuleSearchResult = {
  id: string;
  label: string;
  href: string;
  sectionLabel: string;
  icon?: SidebarIcon;
};

export const MODULE_SEARCH_MIN_QUERY_LENGTH = 2;

const flattenNavItems = (
  items: readonly SidebarNavItem[],
  sectionLabel: string,
): AdminModuleSearchResult[] =>
  items.flatMap((item) => [
    { id: item.id, label: item.label, href: item.href, sectionLabel, icon: item.icon },
    ...(item.items ? flattenNavItems(item.items, sectionLabel) : []),
  ]);

export const flattenSidebarSections = (
  sections: readonly SidebarNavSection[],
): AdminModuleSearchResult[] =>
  sections.flatMap((section) => flattenNavItems(section.items, section.label ?? section.id));

export const searchAdminModules = (
  searchableModules: readonly AdminModuleSearchResult[],
  query: string,
): AdminModuleSearchResult[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < MODULE_SEARCH_MIN_QUERY_LENGTH) return [];
  return searchableModules.filter((result) => result.label.toLowerCase().includes(normalizedQuery));
};
