"use client";

import type { FeedPost } from "@/features/explore";
import { getAvatarColor } from "@/shared/lib/avatarColor";

import { PostActionsMenu } from "./PostActionsMenu";

type CreatorPostThumbnailProps = {
  post: FeedPost;
  onClick: () => void;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export const CreatorPostThumbnail = ({
  post,
  onClick,
  isOwnProfile,
  onEdit,
  onDelete,
}: CreatorPostThumbnailProps) => (
  <div className="group relative aspect-[4/5]">
    <div
      className="absolute inset-0 overflow-hidden rounded-2xl border border-border bg-cover bg-center transition-colors group-hover:border-foreground/30"
      style={
        post.imageUrl
          ? { backgroundImage: `url(${post.imageUrl})` }
          : { backgroundColor: getAvatarColor(post.id) }
      }
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={post.caption ?? "View post"}
        className="absolute inset-0 cursor-pointer"
      />
    </div>

    {isOwnProfile && onEdit && onDelete && (
      <PostActionsMenu onEdit={onEdit} onDelete={onDelete} className="absolute right-2 top-2" />
    )}
  </div>
);
