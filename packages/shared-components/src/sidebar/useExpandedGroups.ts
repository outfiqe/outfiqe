import { useMemo, useState } from "react";

import { getActiveTrailIds } from "./activeTrail";
import type { SidebarNavSection } from "./types";

export type ExpandedGroups = {
  readonly isExpanded: (id: string) => boolean;
  readonly toggle: (id: string) => void;
};

export const useExpandedGroups = (
  sections: readonly SidebarNavSection[],
  pathname: string,
  isActive?: (href: string, pathname: string) => boolean,
): ExpandedGroups => {
  const activeTrailIds = useMemo(
    () => getActiveTrailIds(sections, pathname, isActive),
    [sections, pathname, isActive],
  );

  const [pathnameAtOverride, setPathnameAtOverride] = useState(pathname);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  if (pathname !== pathnameAtOverride) {
    setPathnameAtOverride(pathname);
    setOverrides({});
  }

  const isExpanded = (id: string): boolean => overrides[id] ?? activeTrailIds.has(id);

  const toggle = (id: string): void => {
    setOverrides((prev) => ({ ...prev, [id]: !isExpanded(id) }));
  };

  return { isExpanded, toggle };
};
