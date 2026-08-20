import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { CreatorPostThumbnail } from "@/features/creator-profile/components/CreatorPostThumbnail";
import type { FeedPost } from "@/features/explore";

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
  caption: "Winter layers done right",
  likeCount: 0,
  commentCount: 0,
  saveCount: 0,
  isLiked: false,
  isSaved: false,
  isFollowingCreator: false,
  taggedProducts: [],
  hashtags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("CreatorPostThumbnail", () => {
  it("calls onClick when the thumbnail is activated", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<CreatorPostThumbnail post={buildPost()} onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Winter layers done right" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("falls back to a generic label when there's no caption", () => {
    render(<CreatorPostThumbnail post={buildPost({ caption: null })} onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "View post" })).toBeInTheDocument();
  });

  it("renders the caption text when present", () => {
    render(
      <CreatorPostThumbnail
        post={buildPost({ caption: "Winter layers done right" })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Winter layers done right")).toBeInTheDocument();
  });

  it("shows the post-actions menu only when it's the owner's profile with handlers provided", () => {
    render(
      <CreatorPostThumbnail
        post={buildPost()}
        onClick={vi.fn()}
        isOwnProfile
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Post options" })).toBeInTheDocument();
  });

  it("hides the post-actions menu on someone else's profile", () => {
    render(<CreatorPostThumbnail post={buildPost()} onClick={vi.fn()} isOwnProfile={false} />);

    expect(screen.queryByRole("button", { name: "Post options" })).not.toBeInTheDocument();
  });

  it("hides the post-actions menu when isOwnProfile is true but no handlers are given", () => {
    render(<CreatorPostThumbnail post={buildPost()} onClick={vi.fn()} isOwnProfile />);

    expect(screen.queryByRole("button", { name: "Post options" })).not.toBeInTheDocument();
  });
});
