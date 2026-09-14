import { Badge, Button, Input, Skeleton, toast } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ConfirmModal } from "@/components/ConfirmModal";
import { getErrorMessage } from "@/lib/errorMessages";

import { contentBrowserApi } from "./api";
import { useInfiniteAdminLooks } from "./hooks/useInfiniteAdminLooks";
import { PostCommentsPanel } from "./PostCommentsPanel";
import type { AdminLook } from "./schemas";

const SEARCH_DEBOUNCE_MS = 300;
const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

type DeleteCommentTarget = {
  lookId: string;
  commentId: string;
  preview: string;
};

const formatCreatedAt = (createdAt: string): string =>
  new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const ContentBrowserPage = () => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [expandedLookId, setExpandedLookId] = useState<string | null>(null);
  const [deleteLookTarget, setDeleteLookTarget] = useState<AdminLook | null>(null);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<DeleteCommentTarget | null>(null);

  const {
    data: looksQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteAdminLooks(debouncedQuery.trim());
  const looks = looksQuery?.pages.flatMap((page) => page.items) ?? [];

  const deleteLook = useMutation({
    mutationFn: (lookId: string) => contentBrowserApi.deleteLook(lookId),
    onSuccess: (_result, lookId) => {
      queryClient.invalidateQueries({ queryKey: ["content-browser", "looks"] });
      if (expandedLookId === lookId) setExpandedLookId(null);
      setDeleteLookTarget(null);
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const deleteComment = useMutation({
    mutationFn: ({ lookId, commentId }: DeleteCommentTarget) =>
      contentBrowserApi.deleteComment(lookId, commentId),
    onSuccess: (_result, { lookId }) => {
      queryClient.invalidateQueries({ queryKey: ["content-browser", "comments", lookId] });
      queryClient.invalidateQueries({ queryKey: ["content-browser", "replies", lookId] });
      queryClient.invalidateQueries({ queryKey: ["content-browser", "looks"] });
      setDeleteCommentTarget(null);
    },
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Browse posts</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Search creator posts and comments directly and take one down without waiting for a report.
      </p>

      <Input
        className="mt-5 max-w-sm"
        placeholder="Search by caption or creator…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load posts.</p>}
        {!isLoading && !error && looks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {debouncedQuery.trim() ? `No posts match "${debouncedQuery.trim()}".` : "No posts yet."}
          </p>
        )}

        {looks.map((look) => {
          const isExpanded = expandedLookId === look.id;

          return (
            <div key={look.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex gap-4">
                <div
                  className="size-20 shrink-0 rounded-lg bg-muted bg-cover bg-center"
                  style={{ backgroundImage: `url(${look.imageUrl})` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">@{look.creator.handle}</p>
                    {look.creator.contentFlagCount > 0 && (
                      <Badge showDot={false} tone="negative">
                        {look.creator.contentFlagCount} prior removal
                        {look.creator.contentFlagCount === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                  {look.caption && (
                    <p className="mt-1 line-clamp-2 text-sm text-foreground">{look.caption}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {look.likeCount} likes &middot; {look.commentCount} comments &middot;{" "}
                    {look.saveCount} saves &middot; {formatCreatedAt(look.createdAt)} &middot;{" "}
                    <a
                      href={`${WEB_URL}/creator/${look.creator.handle}?look=${look.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      View post
                    </a>
                  </p>

                  <div className="mt-2.5 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setExpandedLookId(isExpanded ? null : look.id)}
                    >
                      {isExpanded ? "Hide comments" : `Comments (${look.commentCount})`}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteLookTarget(look)}
                      className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                    >
                      Delete post
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <PostCommentsPanel
                  lookId={look.id}
                  onDeleteComment={(commentId, preview) =>
                    setDeleteCommentTarget({ lookId: look.id, commentId, preview })
                  }
                  deletingCommentId={
                    deleteComment.isPending ? (deleteComment.variables?.commentId ?? null) : null
                  }
                />
              )}
            </div>
          );
        })}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>

      <ConfirmModal
        open={deleteLookTarget !== null}
        title="Delete post"
        description={
          deleteLookTarget
            ? `Delete @${deleteLookTarget.creator.handle}'s post? This can't be undone.`
            : undefined
        }
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        destructive
        isPending={deleteLook.isPending}
        onConfirm={() => {
          if (deleteLookTarget) deleteLook.mutate(deleteLookTarget.id);
        }}
        onCancel={() => setDeleteLookTarget(null)}
      />

      <ConfirmModal
        open={deleteCommentTarget !== null}
        title="Delete comment"
        description={
          deleteCommentTarget
            ? `Delete "${deleteCommentTarget.preview}"? This can't be undone.`
            : undefined
        }
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        destructive
        isPending={deleteComment.isPending}
        onConfirm={() => {
          if (deleteCommentTarget) deleteComment.mutate(deleteCommentTarget);
        }}
        onCancel={() => setDeleteCommentTarget(null)}
      />
    </div>
  );
};
