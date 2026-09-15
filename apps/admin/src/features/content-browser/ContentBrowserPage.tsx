import { Button, Input, Skeleton, toast } from "@outfiqe/design-system";
import { useDebouncedValue } from "@outfiqe/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ConfirmModal } from "@/components/ConfirmModal";
import { getErrorMessage } from "@/lib/errorMessages";

import { contentBrowserApi } from "./api";
import { useInfiniteAdminLooks } from "./hooks/useInfiniteAdminLooks";
import { PostDetailModal } from "./PostDetailModal";
import { PostGridCard } from "./PostGridCard";
import type { AdminLook } from "./schemas";

const SEARCH_DEBOUNCE_MS = 300;

type DeleteCommentTarget = {
  lookId: string;
  commentId: string;
  preview: string;
};

export const ContentBrowserPage = () => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
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
  const detailPost = detailPostId ? (looks.find((look) => look.id === detailPostId) ?? null) : null;

  const deleteLook = useMutation({
    mutationFn: (lookId: string) => contentBrowserApi.deleteLook(lookId),
    onSuccess: (_result, lookId) => {
      queryClient.invalidateQueries({ queryKey: ["content-browser", "looks"] });
      if (detailPostId === lookId) setDetailPostId(null);
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

      <div className="mt-6">
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[4/5] w-full rounded-2xl" />
            ))}
          </div>
        )}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load posts.</p>}
        {!isLoading && !error && looks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {debouncedQuery.trim() ? `No posts match "${debouncedQuery.trim()}".` : "No posts yet."}
          </p>
        )}

        {looks.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {looks.map((look) => (
              <PostGridCard key={look.id} look={look} onClick={() => setDetailPostId(look.id)} />
            ))}
          </div>
        )}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto mt-6"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>

      {detailPost && (
        <PostDetailModal
          look={detailPost}
          onClose={() => setDetailPostId(null)}
          onDeletePost={() => setDeleteLookTarget(detailPost)}
          onDeleteComment={(commentId, preview) =>
            setDeleteCommentTarget({ lookId: detailPost.id, commentId, preview })
          }
          deletingCommentId={
            deleteComment.isPending ? (deleteComment.variables?.commentId ?? null) : null
          }
        />
      )}

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
