"use client";

import { Layers } from "lucide-react";

import { AppImage } from "@/shared/components/AppImage";
import { type TrendingRank, TrendingRankBadge } from "@/shared/components/TrendingRankBadge";
import { getAvatarColor } from "@/shared/lib/avatarColor";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { PostCaption } from "./PostCaption";

const POST_GRID_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

type PostGridCardProps = {
  post: FeedPost;
  onClick: () => void;
  trendingRank?: TrendingRank;
};

export const PostGridCard = ({ post, onClick, trendingRank }: PostGridCardProps) => {
  const { id, imageUrl, images, caption } = post;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onClick}
        aria-label={caption ?? "View post"}
        className="relative block aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-2xl border border-border transition-colors hover:border-foreground/30"
        style={imageUrl ? undefined : { backgroundColor: getAvatarColor(id) }}
      >
        {imageUrl && <AppImage src={imageUrl} alt="" fill sizes={POST_GRID_SIZES} />}

        {trendingRank && <TrendingRankBadge rank={trendingRank} />}

        {images.length > 1 && (
          <span
            aria-hidden
            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/55 text-white"
          >
            <Layers className="size-3.5" />
          </span>
        )}
      </button>

      {caption && (
        <PostCaption
          text={caption}
          className="mt-2 text-[12.5px] leading-snug text-muted-foreground"
        />
      )}
    </div>
  );
};
