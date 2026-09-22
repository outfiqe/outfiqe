import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type {
  CommentPage,
  CommentReplyPage,
  FeedComment,
  FeedCommentReply,
  FeedPost,
} from "../api/exploreFeedSchemas";
import { commentRepliesQueryKey, lookCommentsQueryKey } from "../utils/commentCacheUpdate";
import { useDeleteComment } from "./useDeleteComment";

vi.mock("../api/exploreFeedApi", () => ({
  exploreFeedApi: { deleteComment: vi.fn() },
}));

const LOOK_ID = "look-1";
const PUBLIC_LOOK_KEY = ["creator-looks", "public", LOOK_ID];

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

const buildPost = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  id: LOOK_ID,
  creator: { id: "c1", name: "Asha", handle: "asha", isApproved: true, heightCm: null },
  imageUrl: "https://img.test/1.jpg",
  images: ["https://img.test/1.jpg"],
  image: null,
  layout: "PORTRAIT",
  caption: null,
  likeCount: 0,
  commentCount: 3,
  saveCount: 0,
  isLiked: false,
  isSaved: false,
  isFollowingCreator: false,
  isTrending: false,
  taggedProducts: [],
  hashtags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const renderUseDeleteComment = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(() => useDeleteComment(LOOK_ID), { wrapper }) };
};

afterEach(() => {
  vi.mocked(exploreFeedApi.deleteComment).mockReset();
});

describe("useDeleteComment", () => {
  it("removes a top-level comment and decrements the post's comment count by the full cascade size", async () => {
    vi.mocked(exploreFeedApi.deleteComment).mockResolvedValue(undefined);
    const { result, queryClient } = renderUseDeleteComment();
    queryClient.setQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID), {
      comments: [buildComment({ id: "comment-1", replyCount: 2 })],
      nextCursor: null,
    });
    queryClient.setQueryData(commentRepliesQueryKey(LOOK_ID, "comment-1"), {
      pages: [{ replies: [buildReply()], nextCursor: null } satisfies CommentReplyPage],
      pageParams: [undefined],
    });
    queryClient.setQueryData(PUBLIC_LOOK_KEY, buildPost({ commentCount: 3 }));

    act(() =>
      result.current.mutate({ commentId: "comment-1", parentCommentId: null, totalRemoved: 3 }),
    );

    await waitFor(() =>
      expect(exploreFeedApi.deleteComment).toHaveBeenCalledWith(LOOK_ID, "comment-1"),
    );
    await waitFor(() => {
      const page = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
      expect(page?.comments).toHaveLength(0);
    });
    expect(queryClient.getQueryData(commentRepliesQueryKey(LOOK_ID, "comment-1"))).toBeUndefined();
    expect(queryClient.getQueryData<FeedPost>(PUBLIC_LOOK_KEY)?.commentCount).toBe(0);
  });

  it("removes a reply and decrements the parent's reply count and the post's comment count by one", async () => {
    vi.mocked(exploreFeedApi.deleteComment).mockResolvedValue(undefined);
    const { result, queryClient } = renderUseDeleteComment();
    queryClient.setQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID), {
      comments: [buildComment({ id: "comment-1", replyCount: 1, previewReplies: [buildReply()] })],
      nextCursor: null,
    });
    queryClient.setQueryData(commentRepliesQueryKey(LOOK_ID, "comment-1"), {
      pages: [{ replies: [buildReply()], nextCursor: null } satisfies CommentReplyPage],
      pageParams: [undefined],
    });
    queryClient.setQueryData(PUBLIC_LOOK_KEY, buildPost({ commentCount: 2 }));

    act(() =>
      result.current.mutate({
        commentId: "reply-1",
        parentCommentId: "comment-1",
        totalRemoved: 1,
      }),
    );

    await waitFor(() =>
      expect(exploreFeedApi.deleteComment).toHaveBeenCalledWith(LOOK_ID, "reply-1"),
    );
    await waitFor(() => {
      const page = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
      expect(page?.comments[0]?.replyCount).toBe(0);
      expect(page?.comments[0]?.previewReplies).toEqual([]);
    });
    expect(queryClient.getQueryData<FeedPost>(PUBLIC_LOOK_KEY)?.commentCount).toBe(1);
  });

  it("leaves the caches untouched when the delete request fails", async () => {
    vi.mocked(exploreFeedApi.deleteComment).mockRejectedValue(new Error("boom"));
    const { result, queryClient } = renderUseDeleteComment();
    queryClient.setQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID), {
      comments: [buildComment({ id: "comment-1" })],
      nextCursor: null,
    });

    act(() =>
      result.current.mutate({ commentId: "comment-1", parentCommentId: null, totalRemoved: 1 }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    const page = queryClient.getQueryData<CommentPage>(lookCommentsQueryKey(LOOK_ID));
    expect(page?.comments).toHaveLength(1);
  });
});
