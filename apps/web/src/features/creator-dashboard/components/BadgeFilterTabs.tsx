"use client";

import { cn } from "@/shared/lib/cn";

import { BadgeCategory } from "../api/badgeSchemas";

export const BADGE_FILTER = {
  ALL: "all",
  COLLECTED: "collected",
  LOCKED: "locked",
  ...BadgeCategory,
} as const;
export type BadgeFilterValue = (typeof BADGE_FILTER)[keyof typeof BADGE_FILTER];

const FILTER_LABEL: Record<BadgeFilterValue, string> = {
  [BADGE_FILTER.ALL]: "All",
  [BADGE_FILTER.COLLECTED]: "Collected",
  [BADGE_FILTER.LOCKED]: "Locked",
  [BadgeCategory.BEGINNER]: "Beginner",
  [BadgeCategory.CREATOR]: "Creator",
  [BadgeCategory.COMMUNITY]: "Community",
  [BadgeCategory.ENGAGEMENT]: "Engagement",
  [BadgeCategory.COMMERCE]: "Commerce",
  [BadgeCategory.SPECIAL]: "Special",
};

const FILTER_ORDER: BadgeFilterValue[] = [
  BADGE_FILTER.ALL,
  BADGE_FILTER.COLLECTED,
  BADGE_FILTER.LOCKED,
  BadgeCategory.BEGINNER,
  BadgeCategory.CREATOR,
  BadgeCategory.COMMUNITY,
  BadgeCategory.ENGAGEMENT,
  BadgeCategory.COMMERCE,
  BadgeCategory.SPECIAL,
];

type BadgeFilterTabsProps = {
  value: BadgeFilterValue;
  onChange: (value: BadgeFilterValue) => void;
};

export const BadgeFilterTabs = ({ value, onChange }: BadgeFilterTabsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_ORDER.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          aria-pressed={value === filter}
          className={cn(
            "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
            value === filter
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {FILTER_LABEL[filter]}
        </button>
      ))}
    </div>
  );
};
