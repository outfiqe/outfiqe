"use client";

import { Skeleton } from "@outfiqe/design-system";

import { cn } from "@/shared/lib/cn";

import { EXPLORE_FIXED_TABS, FEED_LAYOUT_OPTIONS, type FeedLayout } from "../explore.constants";
import { useTrendingTags } from "../hooks/useTrendingTags";

const TRENDING_TAG_PLACEHOLDER_COUNT = 4;

interface FeedFilterTabsProps {
  tab: string;
  onChange: (tab: string) => void;
  layout: FeedLayout;
  onLayoutChange: (layout: FeedLayout) => void;
}

export const FeedFilterTabs = ({ tab, onChange, layout, onLayoutChange }: FeedFilterTabsProps) => {
  const { data: trendingTags, isLoading: isTrendingTagsLoading } = useTrendingTags();

  return (
    <div className="sticky top-[var(--site-header-height,0px)] z-30 bg-background px-4">
      <div className="mx-auto flex max-w-6xl items-center gap-3 py-3">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none]">
          {EXPLORE_FIXED_TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              aria-pressed={tab === value}
              className={cn(
                "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
                tab === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}

          {isTrendingTagsLoading
            ? Array.from({ length: TRENDING_TAG_PLACEHOLDER_COUNT }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-16 shrink-0 rounded-full" />
              ))
            : trendingTags?.map(({ tag }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onChange(tag)}
                  aria-pressed={tab === tag}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    tab === tag
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  #{tag}
                </button>
              ))}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {FEED_LAYOUT_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onLayoutChange(value)}
              aria-pressed={layout === value}
              aria-label={`${label} view`}
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors",
                layout === value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
