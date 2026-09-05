import { render, screen } from "@testing-library/react";
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
});
