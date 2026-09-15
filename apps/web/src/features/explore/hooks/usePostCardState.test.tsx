import { toast } from "@outfiqe/design-system";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { shareOrCopyLink } from "@/features/pwa";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { usePostCardState } from "./usePostCardState";

const { authState } = vi.hoisted(() => ({ authState: { isAdmin: false } }));
vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ state: { user: { id: "viewer-1" } }, isAdmin: authState.isAdmin }),
}));

vi.mock("@/features/pwa", () => ({
  shareOrCopyLink: vi.fn().mockResolvedValue("shared"),
}));

vi.mock("./useExploreAuthGate", () => ({
  useExploreAuthGate: () => ({ isAuthenticated: true, gated: (action: () => void) => action() }),
}));

vi.mock("./useLikeLook", () => ({ useLikeLook: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("./useSaveLook", () => ({ useSaveLook: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("./useReportContent", () => ({
  useReportContent: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./useFollowCreator", () => ({
  useFollowCreator: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./useLookComments", () => ({
  useLookComments: () => ({
    comments: { isLoading: false, data: undefined },
    draft: "",
    setDraft: vi.fn(),
    submitComment: vi.fn(),
  }),
}));

const aPost = (overrides: Partial<FeedPost> = {}): FeedPost =>
  ({
    id: "look-1",
    caption: "Streetwear fit",
    creator: { id: "creator-1", handle: "ram-shrestha", name: "Ram Shrestha" },
    taggedProducts: [],
    ...overrides,
  }) as FeedPost;

afterEach(() => {
  vi.mocked(shareOrCopyLink).mockReset().mockResolvedValue("shared");
  vi.spyOn(toast, "success").mockImplementation(() => "");
  vi.spyOn(toast, "error").mockImplementation(() => "");
  authState.isAdmin = false;
});

describe("usePostCardState admin gating", () => {
  it("exposes no like-disabled reason for an ordinary viewer", () => {
    const { result } = renderHook(() => usePostCardState(aPost()));

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.likeDisabledReason).toBeUndefined();
  });

  it("exposes a readable like-disabled reason for a platform admin viewer", () => {
    authState.isAdmin = true;
    const { result } = renderHook(() => usePostCardState(aPost()));

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.likeDisabledReason).toBe(
      "Platform staff accounts can't like posts — this keeps trending and payouts based on real audience activity.",
    );
  });
});

describe("usePostCardState shareLook", () => {
  it("shares a permalink to the look on its creator's profile", async () => {
    const { result } = renderHook(() => usePostCardState(aPost()));

    await result.current.shareLook();

    expect(shareOrCopyLink).toHaveBeenCalledWith({
      title: "Ram Shrestha's look on Outfiqe",
      text: "Streetwear fit",
      url: `${window.location.origin}/creator/ram-shrestha?look=look-1`,
    });
  });

  it("confirms with a toast once the link is copied instead of shared", async () => {
    vi.mocked(shareOrCopyLink).mockResolvedValue("copied");
    const { result } = renderHook(() => usePostCardState(aPost()));

    await result.current.shareLook();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Link copied"));
  });

  it("falls back to the creator's handle when the look has no caption", async () => {
    const { result } = renderHook(() => usePostCardState(aPost({ caption: null })));

    await result.current.shareLook();

    expect(shareOrCopyLink).toHaveBeenCalledWith(
      expect.objectContaining({ text: "See what @ram-shrestha is wearing" }),
    );
  });
});
