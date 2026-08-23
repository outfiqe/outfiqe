import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type {
  CommentPage,
  CommentReplyPage,
  FeedComment,
  FeedCommentReply,
} from "../api/exploreFeedSchemas";
import {
  appendCommentIfNew,
  applyReplyToCommentCaches,
  commentRepliesQueryKey,
  lookCommentsQueryKey,
  removeCommentById,
  replaceCommentId,
  revertReplyOptimisticInsert,
} from "./commentCacheUpdate";

const LOOK_ID = "look-1";

const buildComment = (overrides: Partial<FeedComment> = {}): FeedComment => ({
  id: "comment-1",
  userId: "user-1",
  userName: "Ava Martinez",
  userHandle: "ava",
  userAvatarUrl: null,
  body: "Love this look",
  createdAt: "2026-08-22T10:00:00.000Z",
  replyCount: 0,
  previewReplies: [],
  ...overrides,
});

const buildReply = (overrides: Partial<FeedCommentReply> = {}): FeedCommentReply => ({
  id: "reply-1",
  parentCommentId: "comment-1",
  userId: "user-2",
  userName: "Priya Shah",
  userHandle: "priya",
  userAvatarUrl: null,
  body: "Totally agree",
  createdAt: "2026-08-22T10:05:00.000Z",
  ...overrides,
});

const seedComments = (queryClient: QueryClient, comments: FeedComment[]) => {
  queryClient.setQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID), {
    comments,
    nextCursor: null,
  });
};

const seedReplies = (queryClient: QueryClient, commentId: string, replies: FeedCommentReply[]) => {
  queryClient.setQueryData(commentRepliesQueryKey(LOOK_ID, commentId), {
    pages: [{ replies, nextCursor: null } satisfies CommentReplyPage],
    pageParams: [undefined],
  });
};

describe("appendCommentIfNew", () => {
  it("appends a comment that isn't already in the cache", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [buildComment({ id: "existing" })]);

    appendCommentIfNew(queryClient, LOOK_ID, buildComment({ id: "new-comment" }));

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments.map((comment) => comment.id)).toEqual(["existing", "new-comment"]);
  });

  it("does not duplicate a comment that's already present", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [buildComment({ id: "dup" })]);

    appendCommentIfNew(queryClient, LOOK_ID, buildComment({ id: "dup" }));

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments).toHaveLength(1);
  });
});

describe("replaceCommentId", () => {
  it("swaps a temp comment for the server-confirmed one", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [buildComment({ id: "temp-1", body: "draft" })]);

    replaceCommentId(queryClient, LOOK_ID, "temp-1", buildComment({ id: "real-1", body: "draft" }));

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments.map((comment) => comment.id)).toEqual(["real-1"]);
  });

  it("drops the temp entry instead of duplicating when the real comment already arrived via socket", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [
      buildComment({ id: "temp-1", body: "draft" }),
      buildComment({ id: "real-1", body: "draft" }),
    ]);

    replaceCommentId(queryClient, LOOK_ID, "temp-1", buildComment({ id: "real-1", body: "draft" }));

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments.map((comment) => comment.id)).toEqual(["real-1"]);
  });
});

describe("removeCommentById", () => {
  it("removes the comment matching the given id", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [buildComment({ id: "keep" }), buildComment({ id: "drop" })]);

    removeCommentById(queryClient, LOOK_ID, "drop");

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments.map((comment) => comment.id)).toEqual(["keep"]);
  });
});

describe("applyReplyToCommentCaches", () => {
  it("increments replyCount and appends to previewReplies under the preview cap", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [
      buildComment({ id: "comment-1", replyCount: 0, previewReplies: [] }),
    ]);

    applyReplyToCommentCaches(queryClient, LOOK_ID, buildReply());

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments[0]?.replyCount).toBe(1);
    expect(cachedPage?.comments[0]?.previewReplies.map((reply) => reply.id)).toEqual(["reply-1"]);
  });

  it("stops growing previewReplies once the preview cap is reached, but keeps counting", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [
      buildComment({
        id: "comment-1",
        replyCount: 2,
        previewReplies: [buildReply({ id: "reply-a" }), buildReply({ id: "reply-b" })],
      }),
    ]);

    applyReplyToCommentCaches(queryClient, LOOK_ID, buildReply({ id: "reply-c" }));

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments[0]?.replyCount).toBe(3);
    expect(cachedPage?.comments[0]?.previewReplies.map((reply) => reply.id)).toEqual([
      "reply-a",
      "reply-b",
    ]);
  });

  it("does not double-count a reply that's redelivered while its thread is expanded", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [
      buildComment({ id: "comment-1", replyCount: 1, previewReplies: [] }),
    ]);
    seedReplies(queryClient, "comment-1", [buildReply({ id: "reply-1" })]);

    applyReplyToCommentCaches(queryClient, LOOK_ID, buildReply({ id: "reply-1" }));

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments[0]?.replyCount).toBe(1);
  });

  it("appends a new reply to the expanded replies list without duplicating it", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [
      buildComment({ id: "comment-1", replyCount: 1, previewReplies: [] }),
    ]);
    seedReplies(queryClient, "comment-1", [buildReply({ id: "reply-1" })]);

    applyReplyToCommentCaches(queryClient, LOOK_ID, buildReply({ id: "reply-2" }));

    const replies = queryClient.getQueryData<{ pages: CommentReplyPage[] }>(
      commentRepliesQueryKey(LOOK_ID, "comment-1"),
    );
    expect(replies?.pages[0]?.replies.map((reply) => reply.id)).toEqual(["reply-1", "reply-2"]);
  });
});

describe("revertReplyOptimisticInsert", () => {
  it("removes the optimistic reply from both the preview and the expanded list, decrementing the count", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [
      buildComment({
        id: "comment-1",
        replyCount: 1,
        previewReplies: [buildReply({ id: "temp-1" })],
      }),
    ]);
    seedReplies(queryClient, "comment-1", [buildReply({ id: "temp-1" })]);

    revertReplyOptimisticInsert(queryClient, LOOK_ID, "comment-1", "temp-1");

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments[0]?.replyCount).toBe(0);
    expect(cachedPage?.comments[0]?.previewReplies).toEqual([]);

    const replies = queryClient.getQueryData<{ pages: CommentReplyPage[] }>(
      commentRepliesQueryKey(LOOK_ID, "comment-1"),
    );
    expect(replies?.pages[0]?.replies).toEqual([]);
  });

  it("never decrements replyCount below zero", () => {
    const queryClient = new QueryClient();
    seedComments(queryClient, [
      buildComment({ id: "comment-1", replyCount: 0, previewReplies: [] }),
    ]);

    revertReplyOptimisticInsert(queryClient, LOOK_ID, "comment-1", "temp-1");

    const cachedPage = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(cachedPage?.comments[0]?.replyCount).toBe(0);
  });
});
