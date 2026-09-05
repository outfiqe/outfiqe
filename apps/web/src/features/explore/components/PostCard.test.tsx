import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { PostCard } from "./PostCard";

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ state: { user: { id: "viewer-1" } } }),
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
vi.mock("../hooks/useRecordLookView", () => ({ useRecordLookView: () => ({ current: null }) }));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
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

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal(
    "IntersectionObserver",
    class IntersectionObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("PostCard caption spacing", () => {
  it("adds a divider above the actions row when there is a caption", () => {
    render(<PostCard post={aPost({ caption: "Streetwear fit" })} />);

    const actionsRow = screen.getByRole("button", { name: "Save post" }).parentElement
      ?.parentElement;

    expect(actionsRow).toHaveClass("border-t");
    expect(actionsRow).toHaveClass("mt-2.5");
  });

  it("omits the extra divider and spacing when there is no caption or tagged products", () => {
    render(<PostCard post={aPost({ caption: null })} />);

    const actionsRow = screen.getByRole("button", { name: "Save post" }).parentElement
      ?.parentElement;

    expect(actionsRow).not.toHaveClass("border-t");
    expect(actionsRow).not.toHaveClass("mt-2.5");
  });
});
