import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PostActionsRow } from "./PostActionsRow";

const baseProps = {
  isLiked: false,
  likeCount: 3,
  onLike: vi.fn(),
  commentCount: 2,
  isSaved: false,
  onSave: vi.fn(),
  onShare: vi.fn(),
};

describe("PostActionsRow", () => {
  it("shares the post when the share button is pressed", async () => {
    const onShare = vi.fn();
    render(<PostActionsRow {...baseProps} onShare={onShare} />);

    await userEvent.click(screen.getByRole("button", { name: /share post/i }));

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("does not confuse sharing with saving", async () => {
    const onShare = vi.fn();
    const onSave = vi.fn();
    render(<PostActionsRow {...baseProps} onShare={onShare} onSave={onSave} />);

    await userEvent.click(screen.getByRole("button", { name: /save post/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onShare).not.toHaveBeenCalled();
  });

  it("keeps the like button visible and inert, and explains why on hover, when a disabled reason is given", async () => {
    const onLike = vi.fn();
    render(
      <PostActionsRow
        {...baseProps}
        onLike={onLike}
        likeDisabledReason="Staff accounts can't like posts."
      />,
    );

    const likeButton = screen.getByRole("button", { name: "3" });
    expect(likeButton).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(likeButton);
    expect(onLike).not.toHaveBeenCalled();

    fireEvent.focus(likeButton);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Staff accounts can't like posts.",
    );
  });

  it("renders the comment count as read-only text when no click handler is given", () => {
    render(<PostActionsRow {...baseProps} onCommentClick={undefined} />);

    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
