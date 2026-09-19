import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { PostGridCard } from "./PostGridCard";

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const buildPost = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  id: "post-1",
  creator: { id: "creator-1", name: "Ava Martinez", handle: "ava", isApproved: true },
  imageUrl: "https://cdn.test/post-1.jpg",
  images: ["https://cdn.test/post-1.jpg"],
  layout: "PORTRAIT",
  caption: "Winter layers done right",
  likeCount: 0,
  commentCount: 0,
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

describe("PostGridCard", () => {
  it("calls onClick when the tile is activated", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<PostGridCard post={buildPost()} onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Winter layers done right" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it.each([
    ["PORTRAIT", "0.8"],
    ["SQUARE", "1"],
    ["TALL", String(9 / 16)],
  ] as const)("renders the %s layout at aspect ratio %s", (layout, aspectRatio) => {
    render(<PostGridCard post={buildPost({ layout })} onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Winter layers done right" });
    expect(button).toHaveStyle({ aspectRatio });
  });
});
