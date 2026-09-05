import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { PostDetailModal } from "./PostDetailModal";

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ state: { user: { id: "viewer-1", name: "Viewer" } } }),
}));
vi.mock("@/features/pwa", () => ({ shareOrCopyLink: vi.fn() }));
vi.mock("../hooks/useExploreAuthGate", () => ({
  useExploreAuthGate: () => ({ isAuthenticated: true, gated: (action: () => void) => action() }),
}));
vi.mock("../hooks/useLikeLook", () => ({
  useLikeLook: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("../hooks/useSaveLook", () => ({
  useSaveLook: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("../hooks/useFollowCreator", () => ({
  useFollowCreator: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("../hooks/useLookComments", () => ({
  useLookComments: () => ({
    comments: { isLoading: false, data: undefined },
    draft: "",
    setDraft: vi.fn(),
    submitComment: vi.fn(),
  }),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@outfiqe/design-system", () => ({
  Modal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Skeleton: ({ className }: { className?: string }) => <div className={className} />,
}));

const aPost = (overrides: Partial<FeedPost> = {}): FeedPost =>
  ({
    id: "look-1",
    creator: { id: "creator-1", handle: "ram-shrestha", name: "Ram Shrestha", isApproved: true },
    imageUrl: "",
    images: [],
    caption: null,
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    isLiked: false,
    isSaved: false,
    isFollowingCreator: false,
    taggedProducts: [],
    hashtags: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }) as FeedPost;

describe("PostDetailModal caption spacing", () => {
  it("adds a divider above the actions row when there is a caption", () => {
    render(<PostDetailModal post={aPost({ caption: "Streetwear fit" })} onClose={vi.fn()} />);

    const actionsRow = screen.getByRole("button", { name: "Save post" }).parentElement
      ?.parentElement;

    expect(actionsRow).toHaveClass("border-t");
    expect(actionsRow).toHaveClass("mt-2.5");
  });

  it("omits the extra divider and spacing when there is no caption or tagged products", () => {
    render(<PostDetailModal post={aPost({ caption: null })} onClose={vi.fn()} />);

    const actionsRow = screen.getByRole("button", { name: "Save post" }).parentElement
      ?.parentElement;

    expect(actionsRow).not.toHaveClass("border-t");
    expect(actionsRow).not.toHaveClass("mt-2.5");
  });
});
