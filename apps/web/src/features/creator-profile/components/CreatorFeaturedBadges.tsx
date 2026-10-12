"use client";

import { AchievementBadgeIcon } from "@outfiqe/design-system";

import type { FeaturedBadge } from "@/features/creator-dashboard/badges/api/badgeSchemas";

import { badgeAccentColor } from "../utils/badgeAccentColor";

const MAX_PROFILE_FEATURED_BADGES = 3;

type CreatorFeaturedBadgesProps = {
  featuredBadges: FeaturedBadge[];
};

export const CreatorFeaturedBadges = ({ featuredBadges }: CreatorFeaturedBadgesProps) => (
  <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-2.5 pr-1.5">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      Badges
    </span>
    <div className="flex items-center gap-1.5">
      {featuredBadges.slice(0, MAX_PROFILE_FEATURED_BADGES).map((badge) => {
        const accentColor = badgeAccentColor(badge.designConfig);
        return (
          <span
            key={badge.id}
            title={badge.name}
            className="flex size-7 shrink-0 items-center justify-center rounded-full border sm:size-9"
            style={{
              backgroundColor: `${accentColor}1A`,
              borderColor: `${accentColor}4D`,
            }}
          >
            <AchievementBadgeIcon
              icon={badge.icon}
              designConfig={badge.designConfig}
              rarity={badge.rarity}
              isLocked={false}
              className="size-6 sm:size-8"
            />
          </span>
        );
      })}
    </div>
  </div>
);
