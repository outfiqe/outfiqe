"use client";

import { Bookmark } from "lucide-react";
import Link, { useLinkStatus } from "next/link";

import { SAVED_QUERY_PARAM, SAVED_TAB } from "@/features/wishlist";
import { cn } from "@/shared/lib/cn";

import { EXPLORE_FIXED_TABS, FEED_LAYOUT_OPTIONS, type FeedLayout } from "../explore.constants";

type ExploreSidebarNavProps = {
  tab: string;
  onChange: (tab: string) => void;
  layout: FeedLayout;
  onLayoutChange: (layout: FeedLayout) => void;
};

const NAV_ITEM_CLASS =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const NAV_ITEM_SELECTED_CLASS = "bg-foreground text-background";
const NAV_ITEM_UNSELECTED_CLASS = "text-muted-foreground hover:bg-muted hover:text-foreground";
const LAYOUT_ITEM_SELECTED_CLASS = "bg-muted text-foreground";

const SavedNavLink = () => {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(NAV_ITEM_CLASS, pending ? NAV_ITEM_SELECTED_CLASS : NAV_ITEM_UNSELECTED_CLASS)}
    >
      <Bookmark className="size-4 shrink-0" />
      Saved
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full bg-current transition-opacity duration-150",
          pending ? "opacity-70 motion-safe:animate-pulse" : "opacity-0",
        )}
      />
    </span>
  );
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
            NAV_ITEM_CLASS,
            tab === value ? NAV_ITEM_SELECTED_CLASS : NAV_ITEM_UNSELECTED_CLASS,
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </button>
      ))}

      <div className="my-2 border-t border-border" />

      <h4 className="px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Library
      </h4>

      <Link
        href={`/wishlist?${SAVED_QUERY_PARAM.TAB}=${SAVED_TAB.POSTS}`}
        className="block rounded-lg"
      >
        <SavedNavLink />
      </Link>

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
            NAV_ITEM_CLASS,
            layout === value ? LAYOUT_ITEM_SELECTED_CLASS : NAV_ITEM_UNSELECTED_CLASS,
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </button>
      ))}
    </aside>
  );
};
