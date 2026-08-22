"use client";

import { Skeleton, toast } from "@outfiqe/design-system";
import { useMemo, useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useBadgeCollection } from "../hooks/useBadgeCollection";
import { useUpdateFeaturedBadges } from "../hooks/useUpdateFeaturedBadges";
import { AchievementBadgeCard } from "./AchievementBadgeCard";
import { BADGE_FILTER, BadgeFilterTabs, type BadgeFilterValue } from "./BadgeFilterTabs";

const MAX_FEATURED_BADGES = 6;

export const BadgeCollectionSection = () => {
  const { data: collection, isPending } = useBadgeCollection();
  const updateFeatured = useUpdateFeaturedBadges();
  const [filter, setFilter] = useState<BadgeFilterValue>(BADGE_FILTER.ALL);

  const featuredOrder = useMemo(
    () =>
      (collection ?? [])
        .filter((entry) => entry.isFeatured)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .map((entry) => entry.id),
    [collection],
  );

  const toggleFeatured = (badgeId: string) => {
    const nextOrder = featuredOrder.includes(badgeId)
      ? featuredOrder.filter((id) => id !== badgeId)
      : [...featuredOrder, badgeId].slice(0, MAX_FEATURED_BADGES);

    updateFeatured.mutate(nextOrder, { onError: (error) => toast.error(getErrorMessage(error)) });
  };

  const filtered = (collection ?? []).filter((entry) => {
    if (filter === BADGE_FILTER.ALL) return true;
    if (filter === BADGE_FILTER.COLLECTED) return entry.isCollected;
    if (filter === BADGE_FILTER.LOCKED) return !entry.isCollected;
    return entry.category === filter;
  });

  const collectedCount = (collection ?? []).filter((entry) => entry.isCollected).length;
  const totalCount = collection?.length ?? 0;

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Badge collection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPending ? "Loading your collection…" : `${collectedCount} / ${totalCount} collected`}
        </p>
      </div>

      <div className="mt-4">
        <BadgeFilterTabs value={filter} onChange={setFilter} />
      </div>

      {isPending && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && filtered.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No badges match this filter yet.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((entry) => (
            <AchievementBadgeCard
              key={entry.id}
              entry={entry}
              isFeaturable={featuredOrder.length < MAX_FEATURED_BADGES}
              onToggleFeatured={toggleFeatured}
            />
          ))}
        </div>
      )}
    </div>
  );
};
