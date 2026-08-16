"use client";

import type { FeedPost } from "@/features/explore";
import { getAvatarColor } from "@/shared/lib/avatarColor";

type CreatorPostThumbnailProps = {
  post: FeedPost;
  onClick: () => void;
};

export const CreatorPostThumbnail = ({ post, onClick }: CreatorPostThumbnailProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={post.caption ?? "View post"}
    className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-2xl border border-border bg-cover bg-center transition-colors hover:border-foreground/30"
    style={
      post.imageUrl
        ? { backgroundImage: `url(${post.imageUrl})` }
        : { backgroundColor: getAvatarColor(post.id) }
    }
  />
);
