"use client";

import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type { FeedTaggedProduct } from "../api/exploreFeedSchemas";

type PostTagPillProps = {
  lookId: string;
  tag: FeedTaggedProduct;
  className?: string;
};

export const PostTagPill = ({ lookId, tag, className }: PostTagPillProps) => {
  return (
    <Link
      href={`/product/${tag.id}`}
      onClick={() => void exploreFeedApi.recordTagClick(lookId, tag.id)}
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border border-border py-1 pl-2 pr-3 text-[12px] font-medium text-foreground transition-colors hover:border-foreground",
        className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
      <span className="truncate">{tag.name}</span>
    </Link>
  );
};
