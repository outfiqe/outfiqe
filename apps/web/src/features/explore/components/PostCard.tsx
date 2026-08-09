"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Heart, MessageCircle } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { useAuth } from "@/features/auth/context/AuthContext";
import { exploreFeedApi } from "../api/exploreFeedApi";
import { useFollowCreator } from "../hooks/useFollowCreator";
import { useLikeLook } from "../hooks/useLikeLook";
import { useSaveLook } from "../hooks/useSaveLook";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { patchPostInFeedCaches } from "../hooks/feedCacheUpdate";
import type { FeedPost } from "../api/exploreFeedSchemas";

interface PostCardProps {
  post: FeedPost;
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, state } = useAuth();
  const likeMutation = useLikeLook();
  const saveMutation = useSaveLook();
  const followMutation = useFollowCreator();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const isOwnPost = state.user?.id === post.creator.id;
  const primaryTag = post.taggedProducts[0];

  const goToSignIn = () => router.push("/login?redirect=/explore");
  const gated = (action: () => void) => (isAuthenticated ? action() : goToSignIn());

  const comments = useQuery({
    queryKey: ["look-comments", post.id],
    queryFn: () => exploreFeedApi.listComments(post.id),
    enabled: commentsOpen,
  });

  const submitComment = async () => {
    const body = draft.trim();
    if (!body) return;

    setDraft("");
    await exploreFeedApi.addComment(post.id, body);
    patchPostInFeedCaches(queryClient, post.id, (current) => ({
      ...current,
      commentCount: current.commentCount + 1,
    }));
    await queryClient.invalidateQueries({ queryKey: ["look-comments", post.id] });
  };

  return (
    <article className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border transition-colors hover:border-foreground/30">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Link href={`/creator/${post.creator.handle}`} className="shrink-0">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: getAvatarColor(post.creator.id) }}
          >
            {initialsFor(post.creator.name)}
          </span>
        </Link>
        <Link href={`/creator/${post.creator.handle}`} className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-semibold text-foreground">{post.creator.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">@{post.creator.handle}</p>
        </Link>

        {!isOwnPost && (
          <button
            type="button"
            onClick={() =>
              gated(() =>
                followMutation.mutate({
                  creatorId: post.creator.id,
                  following: post.isFollowingCreator,
                }),
              )
            }
            aria-pressed={post.isFollowingCreator}
            className={cn(
              "ml-auto shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              post.isFollowingCreator
                ? "border-foreground bg-foreground text-background"
                : "border-foreground text-foreground hover:bg-foreground hover:text-background",
            )}
          >
            {post.isFollowingCreator ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <div className="relative">
        <div
          className="w-full bg-cover bg-center"
          style={{
            aspectRatio: "4 / 5",
            backgroundColor: post.imageUrl ? undefined : getAvatarColor(post.id),
            backgroundImage: post.imageUrl ? `url(${post.imageUrl})` : undefined,
          }}
        />

        {primaryTag && (
          <Link
            href={`/product/${primaryTag.id}`}
            onClick={() => void exploreFeedApi.recordTagClick(post.id, primaryTag.id, "FEED")}
            className="absolute bottom-2.5 left-2.5 flex max-w-[calc(100%-20px)] items-center gap-2 rounded-full bg-white/96 py-1.5 pl-2 pr-3.5 text-[12.5px] font-medium text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="truncate">{primaryTag.name}</span>
          </Link>
        )}
      </div>

      <div className="px-3 py-2.5">
        {post.caption && (
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">{post.caption}</p>
        )}

        <div className="mt-2.5 flex items-center gap-4 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() =>
              gated(() => likeMutation.mutate({ lookId: post.id, liked: post.isLiked }))
            }
            aria-pressed={post.isLiked}
            className={cn(
              "flex items-center gap-1.5 text-[12.5px] transition-colors",
              post.isLiked ? "text-primary-strong" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Heart className={cn("size-4", post.isLiked && "fill-primary stroke-primary")} />
            {post.likeCount}
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen((open) => !open)}
            aria-pressed={commentsOpen}
            className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <MessageCircle className="size-4" />
            {post.commentCount}
          </button>

          <button
            type="button"
            onClick={() =>
              gated(() => saveMutation.mutate({ lookId: post.id, saved: post.isSaved }))
            }
            aria-pressed={post.isSaved}
            className={cn(
              "ml-auto flex items-center gap-1.5 text-[12.5px] transition-colors",
              post.isSaved ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Save post"
          >
            <Bookmark className={cn("size-4", post.isSaved && "fill-foreground")} />
          </button>
        </div>

        {commentsOpen && (
          <div className="mt-2.5 border-t border-border pt-2.5">
            {comments.isLoading && (
              <p className="text-[12px] text-muted-foreground">Loading comments…</p>
            )}
            {comments.data?.comments.length === 0 && (
              <p className="text-[12px] text-muted-foreground">No comments yet.</p>
            )}
            <ul className="flex flex-col gap-1.5">
              {comments.data?.comments.map((comment) => (
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
}
