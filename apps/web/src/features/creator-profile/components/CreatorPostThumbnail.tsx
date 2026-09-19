"use client";

import { POST_LAYOUT_ASPECT } from "@outfiqe/utils";

import type { FeedPost } from "@/features/explore";
import { PostCaption } from "@/features/explore";
import { AppImage } from "@/shared/components/AppImage";
import { getAvatarColor } from "@/shared/lib/avatarColor";

import { PostActionsMenu } from "./PostActionsMenu";

const CREATOR_POST_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

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
  <div className="group relative mb-5">
    <div
      className="relative overflow-hidden rounded-2xl border border-border transition-colors group-hover:border-foreground/30"
      style={{
        aspectRatio: String(POST_LAYOUT_ASPECT[post.layout]),
        ...(post.imageUrl ? null : { backgroundColor: getAvatarColor(post.id) }),
      }}
    >
      {post.imageUrl && (
        <AppImage src={post.imageUrl} image={post.image} alt="" fill sizes={CREATOR_POST_SIZES} />
      )}

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

    {post.caption && (
      <PostCaption
        text={post.caption}
        className="mt-2 text-[12.5px] leading-snug text-muted-foreground"
      />
    )}
  </div>
);
