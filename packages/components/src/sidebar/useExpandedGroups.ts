import { useMemo, useState } from "react";

import { getActiveTrailIds } from "./activeTrail";
import type { SidebarNavSection } from "./types";

export type ExpandedGroups = {
  readonly isExpanded: (id: string) => boolean;
  readonly toggle: (id: string) => void;
};

const idsWithFlippedTrailMembership = (
  previousTrailIds: ReadonlySet<string>,
  nextTrailIds: ReadonlySet<string>,
): string[] =>
  [...previousTrailIds, ...nextTrailIds].filter(
    (id) => previousTrailIds.has(id) !== nextTrailIds.has(id),
  );

export const useExpandedGroups = (
  sections: readonly SidebarNavSection[],
  pathname: string,
  isActive?: (href: string, pathname: string) => boolean,
): ExpandedGroups => {
  const activeTrailIds = useMemo(
    () => getActiveTrailIds(sections, pathname, isActive),
    [sections, pathname, isActive],
  );

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [trackedActiveTrailIds, setTrackedActiveTrailIds] = useState(activeTrailIds);

  if (trackedActiveTrailIds !== activeTrailIds) {
    const flippedIds = idsWithFlippedTrailMembership(trackedActiveTrailIds, activeTrailIds);
    setTrackedActiveTrailIds(activeTrailIds);

    if (flippedIds.length > 0) {
      setOverrides((prev) => {
        const next = { ...prev };
        for (const id of flippedIds) delete next[id];
        return next;
      });
    }
  }

  const isExpanded = (id: string): boolean => overrides[id] ?? activeTrailIds.has(id);

  const toggle = (id: string): void => {
    setOverrides((prev) => ({ ...prev, [id]: !isExpanded(id) }));
  };

  return { isExpanded, toggle };
};
