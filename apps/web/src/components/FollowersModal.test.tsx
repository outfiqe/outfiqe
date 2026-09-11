import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Follower } from "@/shared/lib/followApi";

import { FollowersModal } from "./FollowersModal";

const push = vi.fn();
const mutate = vi.fn();

type AuthMockState = { isAuthenticated: boolean; state: { user: { id: string } | null } };
type ToggleFollowMockState = { mutate: typeof mutate; isPending: boolean };
type FollowersListMockState = {
  data: { pages: { items: Follower[]; nextCursor: string | null }[] };
  isLoading: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
};

const authMock = vi.fn<() => AuthMockState>(() => ({
  isAuthenticated: false,
  state: { user: null },
}));
const toggleFollowMock = vi.fn<() => ToggleFollowMockState>(() => ({
  mutate,
  isPending: false,
}));
const followersListMock = vi.fn<() => FollowersListMockState>(() => ({
  data: { pages: [{ items: [], nextCursor: null }] },
  isLoading: false,
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  isFetchingNextPage: false,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/auth/context/AuthContext", () => ({ useAuth: () => authMock() }));
vi.mock("@/shared/hooks/useFollowersList", () => ({
  useFollowersList: () => followersListMock(),
}));
vi.mock("@/shared/hooks/useToggleFollow", () => ({ useToggleFollow: () => toggleFollowMock() }));

const buildFollower = (overrides: Partial<Follower> = {}): Follower => ({
  id: "follower-1",
  name: "Alex Rivera",
  handle: "alexrivera",
  isCreator: true,
  isFollowedByViewer: false,
  ...overrides,
});

describe("FollowersModal", () => {
  beforeEach(() => {
    push.mockReset();
    mutate.mockReset();
    authMock.mockReset().mockReturnValue({ isAuthenticated: false, state: { user: null } });
    toggleFollowMock.mockReset().mockReturnValue({ mutate, isPending: false });
    followersListMock.mockReset().mockReturnValue({
      data: { pages: [{ items: [buildFollower()], nextCursor: null }] },
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
  });

  it("sends a signed-out viewer to login instead of firing the follow mutation", async () => {
    render(<FollowersModal targetType="user" targetId="creator-1" onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    expect(mutate).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("lets a signed-in viewer follow and reconciles to the server result", async () => {
    authMock.mockReturnValue({ isAuthenticated: true, state: { user: { id: "viewer-1" } } });
    mutate.mockImplementation((_variables, { onSuccess }) => {
      onSuccess({ following: true, followerCount: 5 });
    });

    render(<FollowersModal targetType="user" targetId="creator-1" onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Following" })).toBeInTheDocument();
  });

  it("ignores a click while a follow mutation for that row is still pending", async () => {
    authMock.mockReturnValue({ isAuthenticated: true, state: { user: { id: "viewer-1" } } });
    toggleFollowMock.mockReturnValue({ mutate, isPending: true });

    render(<FollowersModal targetType="user" targetId="creator-1" onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));

    expect(mutate).not.toHaveBeenCalled();
  });
});
