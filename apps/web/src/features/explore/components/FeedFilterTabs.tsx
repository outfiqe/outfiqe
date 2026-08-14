"use client";

import { LayoutGrid, Rows3 } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import { useTrendingTags } from "../hooks/useTrendingTags";

export type FeedLayout = "grid" | "list";

const FIXED_TABS = [
  { value: "for_you", label: "For you" },
  { value: "following", label: "Following" },
  { value: "trending", label: "Trending" },
] as const;

interface FeedFilterTabsProps {
  tab: string;
  onChange: (tab: string) => void;
  layout: FeedLayout;
  onLayoutChange: (layout: FeedLayout) => void;
}

export const FeedFilterTabs = ({ tab, onChange, layout, onLayoutChange }: FeedFilterTabsProps) => {
  const { data: trendingTags } = useTrendingTags();

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 backdrop-filter backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 py-3">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none]">
          {FIXED_TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              aria-pressed={tab === value}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}

          {trendingTags?.map(({ tag }) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(tag)}
              aria-pressed={tab === tag}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === tag
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Grid/list layout toggle — pinned to the end of the row so it stays put while the
            tabs above scroll horizontally on narrow screens. */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onLayoutChange("grid")}
            aria-pressed={layout === "grid"}
            aria-label="Grid view"
            className={cn(
              "flex size-9 items-center justify-center rounded-lg transition-colors",
              layout === "grid"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onLayoutChange("list")}
            aria-pressed={layout === "list"}
            aria-label="List view"
            className={cn(
              "flex size-9 items-center justify-center rounded-lg transition-colors",
              layout === "list"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <Rows3 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
