"use client";

import { cn } from "@/shared/lib/cn";

import { EXPLORE_FIXED_TABS, FEED_LAYOUT_OPTIONS, type FeedLayout } from "../explore.constants";

type ExploreSidebarNavProps = {
  tab: string;
  onChange: (tab: string) => void;
  layout: FeedLayout;
  onLayoutChange: (layout: FeedLayout) => void;
};

export const ExploreSidebarNav = ({
  tab,
  onChange,
  layout,
  onLayoutChange,
}: ExploreSidebarNavProps) => {
  return (
    <aside className="sticky top-[76px] hidden h-fit w-56 shrink-0 flex-col gap-1 rounded-xl border border-border p-3 lg:flex">
      {EXPLORE_FIXED_TABS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={tab === value}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            tab === value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </button>
      ))}

      <div className="my-2 border-t border-border" />

      <h4 className="px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        View
      </h4>

      {FEED_LAYOUT_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onLayoutChange(value)}
          aria-pressed={layout === value}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            layout === value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </button>
      ))}
    </aside>
  );
};
