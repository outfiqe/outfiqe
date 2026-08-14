"use client";

import { Skeleton } from "@outfiqe/design-system";
import { Bookmark, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type { FeedPost } from "../api/exploreFeedSchemas";
import { usePostCardState } from "../hooks/usePostCardState";

interface PostCardProps {
  post: FeedPost;
}

export const PostCard = ({ post }: PostCardProps) => {
  const {
    id,
    creator,
    imageUrl,
    isFollowingCreator,
    caption,
    isLiked,
    likeCount,
    commentCount,
    isSaved,
  } = post;
  const { id: creatorId, handle: creatorHandle, name: creatorName } = creator;

  const {
    isAuthenticated,
    isOwnPost,
    primaryTag,
    gated,
    likeMutation,
    saveMutation,
    followMutation,
    commentsOpen,
    setCommentsOpen,
    draft,
    setDraft,
    comments,
    submitComment,
  } = usePostCardState(post);
  const { isLoading: commentsLoading, data: commentsData } = comments;

  return (
    <article className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border transition-colors hover:border-foreground/30">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Link href={`/creator/${creatorHandle}`} className="shrink-0">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: getAvatarColor(creatorId) }}
          >
            {initialsFor(creatorName)}
          </span>
        </Link>
        <Link href={`/creator/${creatorHandle}`} className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-semibold text-foreground">{creatorName}</p>
          <p className="truncate text-[11px] text-muted-foreground">@{creatorHandle}</p>
        </Link>

        {!isOwnPost && (
          <button
            type="button"
            onClick={() =>
              gated(() =>
                followMutation.mutate({
                  creatorId,
                  following: isFollowingCreator,
                }),
              )
            }
            aria-pressed={isFollowingCreator}
            className={cn(
              "ml-auto shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              isFollowingCreator
                ? "border-foreground bg-foreground text-background"
                : "border-foreground text-foreground hover:bg-foreground hover:text-background",
            )}
          >
            {isFollowingCreator ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <div className="relative">
        <div
          className="w-full bg-cover bg-center"
          style={{
            aspectRatio: "4 / 5",
            backgroundColor: imageUrl ? undefined : getAvatarColor(id),
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          }}
        />

        {primaryTag && (
          <Link
            href={`/product/${primaryTag.id}`}
            onClick={() => void exploreFeedApi.recordTagClick(id, primaryTag.id, "FEED")}
            className="absolute bottom-2.5 left-2.5 flex max-w-[calc(100%-20px)] items-center gap-2 rounded-full bg-white/96 py-1.5 pl-2 pr-3.5 text-[12.5px] font-medium text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="truncate">{primaryTag.name}</span>
          </Link>
        )}
      </div>

      <div className="px-3 py-2.5">
        {caption && (
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">{caption}</p>
        )}

        <div className="mt-2.5 flex items-center gap-4 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() => gated(() => likeMutation.mutate({ lookId: id, liked: isLiked }))}
            aria-pressed={isLiked}
            className={cn(
              "flex items-center gap-1.5 text-[12.5px] transition-colors",
              isLiked ? "text-primary-strong" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Heart className={cn("size-4", isLiked && "fill-primary stroke-primary")} />
            {likeCount}
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen((open) => !open)}
            aria-pressed={commentsOpen}
            className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <MessageCircle className="size-4" />
            {commentCount}
          </button>

          <button
            type="button"
            onClick={() => gated(() => saveMutation.mutate({ lookId: id, saved: isSaved }))}
            aria-pressed={isSaved}
            className={cn(
              "ml-auto flex items-center gap-1.5 text-[12.5px] transition-colors",
              isSaved ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Save post"
          >
            <Bookmark className={cn("size-4", isSaved && "fill-foreground")} />
          </button>
        </div>

        {commentsOpen && (
          <div className="mt-2.5 border-t border-border pt-2.5">
            {commentsLoading && (
              <div className="space-y-1.5" role="status" aria-label="Loading comments">
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            )}
            {commentsData?.comments.length === 0 && (
              <p className="text-[12px] text-muted-foreground">No comments yet.</p>
            )}
            <ul className="flex flex-col gap-1.5">
              {commentsData?.comments.map((comment) => (
                <li key={comment.id} className="text-[12.5px] leading-snug">
                  <span className="font-semibold text-foreground">@{comment.userHandle}</span>{" "}
                  <span className="text-muted-foreground">{comment.body}</span>
                </li>
              ))}
            </ul>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                gated(() => void submitComment());
              }}
              className="mt-2 flex gap-2"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isAuthenticated ? "Add a comment…" : "Sign in to comment"}
                disabled={!isAuthenticated}
                className="min-w-0 flex-1 rounded-full border border-border bg-transparent px-3 py-1.5 text-[12.5px] outline-none focus:border-foreground disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!isAuthenticated || !draft.trim()}
                className="rounded-full bg-foreground px-3 py-1.5 text-[12px] font-semibold text-background disabled:opacity-40"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
};
