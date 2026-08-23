import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type {
  CommentPage,
  CommentReplyPage,
  FeedComment,
  FeedCommentReply,
} from "../api/exploreFeedSchemas";
import { COMMENT_REPLY_PREVIEW_COUNT } from "../explore.constants";

export const lookCommentsQueryKey = (lookId: string) => ["look-comments", lookId] as const;

export const commentRepliesQueryKey = (lookId: string, commentId: string) =>
  ["look-comment-replies", lookId, commentId] as const;

export const appendCommentIfNew = (
  queryClient: QueryClient,
  lookId: string,
  comment: FeedComment,
): void => {
  queryClient.setQueryData<CommentPage>(lookCommentsQueryKey(lookId), (data) => {
    if (!data) return data;
    if (data.comments.some((existing) => existing.id === comment.id)) return data;
    return { ...data, comments: [...data.comments, comment] };
  });
};

export const replaceCommentId = (
  queryClient: QueryClient,
  lookId: string,
  tempId: string,
  comment: FeedComment,
): void => {
  queryClient.setQueryData<CommentPage>(lookCommentsQueryKey(lookId), (data) => {
    if (!data) return data;
    if (data.comments.some((existing) => existing.id === comment.id)) {
      return { ...data, comments: data.comments.filter((existing) => existing.id !== tempId) };
    }
    return {
      ...data,
      comments: data.comments.map((existing) => (existing.id === tempId ? comment : existing)),
    };
  });
};

export const removeCommentById = (
  queryClient: QueryClient,
  lookId: string,
  commentId: string,
): void => {
  queryClient.setQueryData<CommentPage>(lookCommentsQueryKey(lookId), (data) => {
    if (!data) return data;
    return { ...data, comments: data.comments.filter((existing) => existing.id !== commentId) };
  });
};

export const applyReplyToCommentCaches = (
  queryClient: QueryClient,
  lookId: string,
  reply: FeedCommentReply,
): void => {
  const repliesKey = commentRepliesQueryKey(lookId, reply.parentCommentId);
  const existingReplies = queryClient.getQueryData<InfiniteData<CommentReplyPage>>(repliesKey);
  const alreadyLoaded =
    existingReplies?.pages.some((page) =>
      page.replies.some((existing) => existing.id === reply.id),
    ) ?? false;

  queryClient.setQueryData<CommentPage>(lookCommentsQueryKey(lookId), (data) => {
    if (!data) return data;
    return {
      ...data,
      comments: data.comments.map((comment) => {
        if (comment.id !== reply.parentCommentId) return comment;
        if (alreadyLoaded) return comment;
        if (comment.previewReplies.some((existing) => existing.id === reply.id)) return comment;

        return {
          ...comment,
          replyCount: comment.replyCount + 1,
          previewReplies:
            comment.previewReplies.length < COMMENT_REPLY_PREVIEW_COUNT
              ? [...comment.previewReplies, reply]
              : comment.previewReplies,
        };
      }),
    };
  });

  if (!existingReplies) return;

  queryClient.setQueryData<InfiniteData<CommentReplyPage>>(repliesKey, (data) => {
    if (!data) return data;
    const alreadyPresent = data.pages.some((page) =>
      page.replies.some((existing) => existing.id === reply.id),
    );
    if (alreadyPresent) return data;

    const lastPageIndex = data.pages.length - 1;
    return {
      ...data,
      pages: data.pages.map((page, index) =>
        index === lastPageIndex ? { ...page, replies: [...page.replies, reply] } : page,
      ),
    };
  });
};

export const revertReplyOptimisticInsert = (
  queryClient: QueryClient,
  lookId: string,
  parentCommentId: string,
  tempId: string,
): void => {
  queryClient.setQueryData<CommentPage>(lookCommentsQueryKey(lookId), (data) => {
    if (!data) return data;
    return {
      ...data,
      comments: data.comments.map((comment) =>
        comment.id === parentCommentId
          ? {
              ...comment,
              replyCount: Math.max(comment.replyCount - 1, 0),
              previewReplies: comment.previewReplies.filter((reply) => reply.id !== tempId),
            }
          : comment,
      ),
    };
  });

  queryClient.setQueryData<InfiniteData<CommentReplyPage>>(
    commentRepliesQueryKey(lookId, parentCommentId),
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          replies: page.replies.filter((reply) => reply.id !== tempId),
        })),
      };
    },
  );
};
