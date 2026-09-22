"use client";

import Link from "next/link";

import { cn } from "@/shared/lib/cn";
import { formatHeight } from "@/shared/lib/formatHeight";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type { FeedTaggedProduct } from "../api/exploreFeedSchemas";

type PostTagPillProps = {
  lookId: string;
  tag: FeedTaggedProduct;
  creatorHeightCm: number | null;
  className?: string;
};

export const PostTagPill = ({ lookId, tag, creatorHeightCm, className }: PostTagPillProps) => {
  const fitDetail = [
    creatorHeightCm ? formatHeight(creatorHeightCm) : null,
    tag.sizeWorn ? `size ${tag.sizeWorn}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/product/${tag.id}`}
      prefetch={false}
      onClick={() => void exploreFeedApi.recordTagClick(lookId, tag.id)}
      className={cn(
        "inline-flex max-w-full flex-col items-start gap-0.5 rounded-2xl border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:border-foreground",
        className,
      )}
    >
      <span className="flex max-w-full items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
        <span className="truncate">{tag.name}</span>
      </span>
      {fitDetail && (
        <span className="max-w-full truncate pl-3.5 text-[11px] font-normal text-muted-foreground">
          {fitDetail}
        </span>
      )}
    </Link>
  );
};
