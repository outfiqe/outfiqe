import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { FeedComment, FeedCommentReply } from "../api/exploreFeedSchemas";
import { useCommentReplies } from "../hooks/useCommentReplies";
import { CommentThread } from "./CommentThread";

vi.mock("../hooks/useCommentReplies", () => ({
  useCommentReplies: vi.fn(),
}));

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

const mockUseCommentReplies = (overrides: Partial<ReturnType<typeof useCommentReplies>> = {}) => {
  vi.mocked(useCommentReplies).mockReturnValue({
    data: undefined,
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    draft: "",
    setDraft: vi.fn(),
    submitReply: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useCommentReplies>);
};

describe("CommentThread", () => {
  it("renders the comment and its preview replies without a load-more prompt when nothing is hidden", () => {
    mockUseCommentReplies();
    const comment = buildComment({
      replyCount: 1,
      previewReplies: [buildReply()],
    });

    render(<CommentThread lookId="look-1" comment={comment} isAuthenticated />);

    expect(screen.getByText("Love this look")).toBeInTheDocument();
    expect(screen.getByText("Totally agree")).toBeInTheDocument();
    expect(screen.queryByText(/view \d+ repl/i)).not.toBeInTheDocument();
  });

  it("shows a 'View replies' prompt when there are more replies than the inline preview", () => {
    mockUseCommentReplies();
    const comment = buildComment({
      replyCount: 5,
      previewReplies: [buildReply()],
    });

    render(<CommentThread lookId="look-1" comment={comment} isAuthenticated />);

    expect(screen.getByRole("button", { name: "View 5 replies" })).toBeInTheDocument();
  });

  it("expands to the full reply list when 'View replies' is clicked", async () => {
    const user = userEvent.setup();
    mockUseCommentReplies({
      data: {
        pages: [
          {
            replies: [buildReply({ id: "reply-1" }), buildReply({ id: "reply-2" })],
            nextCursor: null,
          },
        ],
        pageParams: [undefined],
      },
    } as Partial<ReturnType<typeof useCommentReplies>>);
    const comment = buildComment({
      replyCount: 2,
      previewReplies: [buildReply({ id: "reply-1" })],
    });

    render(<CommentThread lookId="look-1" comment={comment} isAuthenticated />);
    await user.click(screen.getByRole("button", { name: "View 2 replies" }));

    expect(useCommentReplies).toHaveBeenLastCalledWith("look-1", "comment-1", true);
  });

  it("does not show a Reply action for an unauthenticated viewer", () => {
    mockUseCommentReplies();
    render(<CommentThread lookId="look-1" comment={buildComment()} isAuthenticated={false} />);

    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
  });

  it("opens a reply box and submits the draft", async () => {
    const user = userEvent.setup();
    const setDraft = vi.fn();
    const submitReply = vi.fn();
    mockUseCommentReplies({ draft: "Nice!", setDraft, submitReply });

    render(<CommentThread lookId="look-1" comment={buildComment()} isAuthenticated />);
    await user.click(screen.getByRole("button", { name: "Reply" }));
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(submitReply).toHaveBeenCalledTimes(1);
  });
});
