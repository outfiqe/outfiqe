"use client";

import { Layers } from "lucide-react";

import { getAvatarColor } from "@/shared/lib/avatarColor";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { PostCaption } from "./PostCaption";

type PostGridCardProps = {
  post: FeedPost;
  onClick: () => void;
};

export const PostGridCard = ({ post, onClick }: PostGridCardProps) => {
  const { id, imageUrl, images, caption } = post;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onClick}
        aria-label={caption ?? "View post"}
        className="relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-cover bg-center transition-colors hover:border-foreground/30"
        style={
          imageUrl
            ? { backgroundImage: `url(${imageUrl})` }
            : { backgroundColor: getAvatarColor(id) }
        }
      >
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
