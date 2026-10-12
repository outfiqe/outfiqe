"use client";

import { AchievementBadgeIcon } from "@outfiqe/design-system";

import type { CreatorProfile } from "../api/creatorProfileSchemas";

type CreatorTitleBadgePillProps = {
  titleBadge: NonNullable<CreatorProfile["titleBadge"]>;
  titleBadgeAccentColor: string | null;
};

export const CreatorTitleBadgePill = ({
  titleBadge,
  titleBadgeAccentColor,
}: CreatorTitleBadgePillProps) => (
  <div
    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 sm:mt-2 sm:gap-2 sm:py-1 sm:pl-1 sm:pr-3"
    style={{
      backgroundColor: `${titleBadgeAccentColor}1A`,
      borderColor: `${titleBadgeAccentColor}4D`,
    }}
  >
    <AchievementBadgeIcon
      icon={titleBadge.icon}
      designConfig={titleBadge.designConfig}
      rarity={titleBadge.rarity}
      isLocked={false}
      className="size-5 sm:size-6"
    />
    <span
      className="text-[11px] font-bold uppercase tracking-wide sm:text-xs"
      style={{ color: titleBadgeAccentColor ?? undefined }}
    >
      {titleBadge.name}
    </span>
  </div>
);
