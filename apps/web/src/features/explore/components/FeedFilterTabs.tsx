"use client";

import { cn } from "@/shared/lib/cn";
import { useTrendingTags } from "../hooks/useTrendingTags";

const FIXED_TABS = [
  { value: "for_you", label: "For you" },
  { value: "following", label: "Following" },
  { value: "trending", label: "Trending" },
] as const;

interface FeedFilterTabsProps {
  tab: string;
  onChange: (tab: string) => void;
}

export function FeedFilterTabs({ tab, onChange }: FeedFilterTabsProps) {
  const { data: trendingTags } = useTrendingTags();

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 backdrop-filter backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
        {FIXED_TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => onChange(entry.value)}
            aria-pressed={tab === entry.value}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === entry.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {entry.label}
          </button>
        ))}

        {trendingTags?.map((entry) => (
          <button
            key={entry.tag}
            type="button"
            onClick={() => onChange(entry.tag)}
            aria-pressed={tab === entry.tag}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === entry.tag
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            #{entry.tag}
          </button>
        ))}
      </div>
    </div>
  );
}
