import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useRouter, useSearchParams } from "next/navigation";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { AuthStatus, CreatorStatus, UserRole, type UserSession } from "@/features/auth/types";
import type { CreatorProfile as CreatorProfileType } from "@/features/creator-profile/api/creatorProfileSchemas";
import { CreatorProfile } from "@/features/creator-profile/components/CreatorProfile";
import { useInfiniteCreatorLooks } from "@/features/creator-profile/hooks/useInfiniteCreatorLooks";
import type * as ExploreModule from "@/features/explore";
import { useChatPanel } from "@/features/messaging";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/messaging", () => ({
  useChatPanel: vi.fn(),
}));

vi.mock("../hooks/useInfiniteCreatorLooks", () => ({
  useInfiniteCreatorLooks: vi.fn(),
}));

vi.mock("@/components/FollowersModal", () => ({
  FollowersModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Followers">
      <button type="button" onClick={onClose}>
        Close followers
      </button>
    </div>
  ),
}));

vi.mock("@/components/FollowingModal", () => ({
  FollowingModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Following">
      <button type="button" onClick={onClose}>
        Close following
      </button>
    </div>
  ),
}));

vi.mock("@/features/explore", async (importOriginal) => {
  const actual = await importOriginal<typeof ExploreModule>();
  return {
    ...actual,
    AddPostButton: () => <button type="button">Add post</button>,
    PostDetailModal: ({ onClose }: { onClose: () => void }) => (
      <div role="dialog" aria-label="Post detail">
        <button type="button" onClick={onClose}>
          Close detail
        </button>
      </div>
    ),
  };
});

vi.mock("@/features/creator-dashboard/components/EditPostModal", () => ({
  EditPostModal: ({ lookId, onClose }: { lookId: string | null; onClose: () => void }) =>
    lookId ? (
      <div role="dialog" aria-label="Edit post">
        <button type="button" onClick={onClose}>
          Close edit
        </button>
      </div>
    ) : null,
}));

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const push = vi.fn();
const replace = vi.fn();
const replaceState = vi.spyOn(window.history, "replaceState");
const fetchNextPage = vi.fn();

const mockSearchParams = (params: Record<string, string> = {}) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(params) as ReturnType<typeof useSearchParams>,
  );
};

const buildPost = (id: string) => ({
  id,
  creator: { id: "creator-9", name: "Ava Martinez", handle: "ava", isApproved: true },
  imageUrl: `https://cdn.test/${id}.jpg`,
  images: [`https://cdn.test/${id}.jpg`],
  caption: `Caption ${id}`,
  likeCount: 0,
  commentCount: 0,
  saveCount: 0,
  isLiked: false,
  isSaved: false,
  isFollowingCreator: false,
  taggedProducts: [],
  hashtags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
});

const buildCreator = (overrides: Partial<CreatorProfileType> = {}): CreatorProfileType => ({
  userId: "creator-9",
  name: "Ava Martinez",
  handle: "ava",
  avatarUrl: null,
  heightCm: null,
  showHeight: false,
  hideFromLeaderboards: false,
  creatorStatus: "APPROVED",
  postsCount: 2,
  followerCount: 10,
  followingCount: 3,
  taggedPiecesCount: 1,
  isFollowing: false,
  featuredBadges: [],
  titleBadge: null,
  ...overrides,
});

const mockLooks = (overrides: Partial<ReturnType<typeof useInfiniteCreatorLooks>> = {}) => {
  vi.mocked(useInfiniteCreatorLooks).mockReturnValue({
    data: {
      pages: [{ posts: [buildPost("p1"), buildPost("p2")], nextCursor: null }],
      pageParams: [undefined],
    },
    fetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useInfiniteCreatorLooks>);
};

const buildUserSession = (userId: string): UserSession => ({
  id: userId,
  name: "Session User",
  email: "session-user@outfiqe.test",
  avatarUrl: null,
  role: UserRole.CUSTOMER,
  isCreator: false,
  creatorStatus: CreatorStatus.NONE,
});

const mockAuth = (userId: string | null, isAuthenticated = true) => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated,
    isAuthResolved: true,
    isBrandOwner: false,
    isAdmin: false,
    isCreator: false,
    isShopper: true,
    hasCrmAccess: false,
    state: {
      user: userId ? buildUserSession(userId) : null,
      accessToken: isAuthenticated ? "test-access-token" : null,
      status: isAuthenticated ? AuthStatus.AUTHENTICATED : AuthStatus.UNAUTHENTICATED,
    },
    dispatch: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  });
};

const renderProfile = (creator: CreatorProfileType) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreatorProfile creator={creator} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  push.mockClear();
  replace.mockClear();
  replaceState.mockClear();
  mockSearchParams();
  fetchNextPage.mockClear();
  mockLooks();
  mockAuth("viewer-1");
  vi.mocked(useChatPanel).mockReturnValue({
    isOpen: false,
    view: { kind: "list" },
    isStartingConversation: false,
    socket: null,
    openConversationWith: vi.fn(),
    openConversation: vi.fn(),
    openList: vi.fn(),
    close: vi.fn(),
  });
});

describe("CreatorProfile loading and post states", () => {
  it("shows the loading skeleton while posts are loading", () => {
    mockLooks({ isLoading: true, data: undefined });
    renderProfile(buildCreator());

    expect(screen.getByRole("status", { name: "Loading posts" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no posts", () => {
    mockLooks({ data: { pages: [{ posts: [], nextCursor: null }], pageParams: [undefined] } });
    renderProfile(buildCreator());

    expect(screen.getByText("No posts yet.")).toBeInTheDocument();
  });

  it("renders a thumbnail for every post across pages", () => {
    renderProfile(buildCreator());

    expect(screen.getByText("Caption p1")).toBeInTheDocument();
    expect(screen.getByText("Caption p2")).toBeInTheDocument();
  });

  it("shows the approved badge only when the creator is approved", () => {
    renderProfile(buildCreator({ creatorStatus: "APPROVED" }));
    expect(screen.getByRole("img", { name: "Approved creator" })).toBeInTheDocument();
  });

  it("hides the approved badge for a non-approved creator", () => {
    renderProfile(buildCreator({ creatorStatus: "PENDING" }));
    expect(screen.queryByRole("img", { name: "Approved creator" })).not.toBeInTheDocument();
  });
});

describe("CreatorProfile own vs visitor view", () => {
  it("shows Edit profile and Add post for the profile owner", () => {
    mockAuth("creator-9");
    renderProfile(buildCreator());

    expect(screen.getByRole("button", { name: "Edit profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add post" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Follow" })).not.toBeInTheDocument();
  });

  it("shows the Follow button for a visitor, hiding owner-only controls", () => {
    mockAuth("viewer-1");
    renderProfile(buildCreator());

    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit profile" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add post" })).not.toBeInTheDocument();
  });

  it("shows the Message button for a visitor, not the profile owner", () => {
    mockAuth("viewer-1");
    const visitorRender = renderProfile(buildCreator());
    expect(screen.getByRole("button", { name: "Message" })).toBeInTheDocument();
    visitorRender.unmount();

    mockAuth("creator-9");
    renderProfile(buildCreator());
    expect(screen.queryByRole("button", { name: "Message" })).not.toBeInTheDocument();
  });
});

describe("CreatorProfile message button", () => {
  it("redirects an unauthenticated visitor to login instead of messaging", async () => {
    mockAuth(null, false);
    const user = userEvent.setup();
    renderProfile(buildCreator());

    await user.click(screen.getByRole("button", { name: "Message" }));

    expect(push).toHaveBeenCalledWith("/login?redirect=/creator/ava");
  });

  it("starts a conversation with the creator when Message is clicked", async () => {
    const openConversationWith = vi.fn();
    vi.mocked(useChatPanel).mockReturnValue({
      isOpen: false,
      view: { kind: "list" },
      isStartingConversation: false,
      socket: null,
      openConversationWith,
      openConversation: vi.fn(),
      openList: vi.fn(),
      close: vi.fn(),
    });

    const user = userEvent.setup();
    renderProfile(buildCreator());

    await user.click(screen.getByRole("button", { name: "Message" }));

    expect(openConversationWith).toHaveBeenCalledWith("creator-9");
  });
});

describe("CreatorProfile follow toggle", () => {
  it("redirects an unauthenticated visitor to login instead of following", async () => {
    mockAuth(null, false);
    const user = userEvent.setup();
    renderProfile(buildCreator());

    await user.click(screen.getByRole("button", { name: "Follow" }));

    expect(push).toHaveBeenCalledWith("/login?redirect=/creator/ava");
  });

  it("optimistically follows and confirms once the request succeeds", async () => {
    mswServer.use(
      http.post("/api/follows/user/creator-9", () =>
        HttpResponse.json({
          success: true,
          message: "Followed.",
          data: { following: true, followerCount: 11 },
        }),
      ),
    );

    const user = userEvent.setup();
    renderProfile(buildCreator({ isFollowing: false, followerCount: 10 }));

    await user.click(screen.getByRole("button", { name: "Follow" }));

    expect(screen.getByRole("button", { name: "Following" })).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
  });

  it("rolls back the optimistic follow when the request fails", async () => {
    mswServer.use(
      http.post("/api/follows/user/creator-9", () =>
        HttpResponse.json({ success: false, message: "Server error" }, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderProfile(buildCreator({ isFollowing: false, followerCount: 10 }));

    await user.click(screen.getByRole("button", { name: "Follow" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument());
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});

describe("CreatorProfile followers/following stats", () => {
  it("disables the followers stat when the count is zero", () => {
    renderProfile(buildCreator({ followerCount: 0 }));

    expect(screen.getByRole("button", { name: /Followers$/ })).toBeDisabled();
  });

  it("opens the followers modal when the stat is clicked", async () => {
    const user = userEvent.setup();
    renderProfile(buildCreator({ followerCount: 10 }));

    await user.click(screen.getByRole("button", { name: /Followers$/ }));

    expect(screen.getByRole("dialog", { name: "Followers" })).toBeInTheDocument();
  });

  it("disables the following stat when the count is zero", () => {
    renderProfile(buildCreator({ followingCount: 0 }));

    expect(screen.getByRole("button", { name: /Following$/ })).toBeDisabled();
  });

  it("opens the following modal when the stat is clicked", async () => {
    const user = userEvent.setup();
    renderProfile(buildCreator({ followingCount: 3 }));

    await user.click(screen.getByRole("button", { name: /Following$/ }));

    expect(screen.getByRole("dialog", { name: "Following" })).toBeInTheDocument();
  });

  it("closes the followers modal via its own close control", async () => {
    const user = userEvent.setup();
    renderProfile(buildCreator({ followerCount: 10 }));

    await user.click(screen.getByRole("button", { name: /Followers$/ }));
    await user.click(screen.getByRole("button", { name: "Close followers" }));

    expect(screen.queryByRole("dialog", { name: "Followers" })).not.toBeInTheDocument();
  });

  it("closes the following modal via its own close control", async () => {
    const user = userEvent.setup();
    renderProfile(buildCreator({ followingCount: 3 }));

    await user.click(screen.getByRole("button", { name: /Following$/ }));
    await user.click(screen.getByRole("button", { name: "Close following" }));

    expect(screen.queryByRole("dialog", { name: "Following" })).not.toBeInTheDocument();
  });
});

describe("CreatorProfile title badge", () => {
  const titleBadge = {
    id: "badge-og",
    name: "Outfiqe OG",
    icon: "🎖️",
    designConfig: { shape: "hexagon" as const, primaryColor: "#0ea5e9" },
    rarity: "EXCLUSIVE" as const,
    showProfileRing: true,
  };

  it("shows the title pill and the avatar ring when showProfileRing is on", () => {
    const { container } = renderProfile(buildCreator({ titleBadge }));

    expect(screen.getByText("Outfiqe OG")).toBeInTheDocument();
    expect(container.querySelector(".animate-avatar-ring-spin")).toBeInTheDocument();
  });

  it("shows the title pill but no avatar ring when showProfileRing is off", () => {
    const { container } = renderProfile(
      buildCreator({ titleBadge: { ...titleBadge, showProfileRing: false } }),
    );

    expect(screen.getByText("Outfiqe OG")).toBeInTheDocument();
    expect(container.querySelector(".animate-avatar-ring-spin")).not.toBeInTheDocument();
  });
});

describe("CreatorProfile edit flow", () => {
  it("updates the profile through the real API and reflects the new name", async () => {
    mswServer.use(
      http.patch("/api/creators/me", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({
          success: true,
          message: "Profile updated.",
          data: {
            userId: "creator-9",
            name: body.name,
            email: "ava@outfiqe.test",
            handle: "ava",
            avatarUrl: null,
            heightCm: null,
            showHeight: false,
            hideFromLeaderboards: false,
            isCreator: true,
            creatorStatus: "APPROVED",
          },
        });
      }),
    );

    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator({ name: "Ava Martinez" }));

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const nameInput = screen.getByLabelText("Display name");
    await user.clear(nameInput);
    await user.type(nameInput, "Ava M.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getAllByText("Ava M.").length).toBeGreaterThan(0);
  });

  it("doesn't call the API when saving a blank name", async () => {
    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator({ name: "Ava Martinez" }));

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const nameInput = screen.getByLabelText("Display name");
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("closes the edit modal without saving when Cancel is clicked", async () => {
    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator());

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Edit profile" })).not.toBeInTheDocument();
  });

  it("closes the edit modal via its own close control", async () => {
    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator());

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog", { name: "Edit profile" })).not.toBeInTheDocument();
  });

  it("lets the owner change the height field", async () => {
    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator({ heightCm: null }));

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const heightInput = screen.getByLabelText("Height (cm)");
    await user.type(heightInput, "170");

    expect(heightInput).toHaveValue(170);
  });
});

describe("CreatorProfile edit flow — username change", () => {
  const patchProfileWithHandle = () =>
    http.patch("/api/creators/me", async ({ request }) => {
      const body = (await request.json()) as { handle?: string };
      return HttpResponse.json({
        success: true,
        message: "Profile updated.",
        data: {
          userId: "creator-9",
          name: "Ava Martinez",
          email: "ava@outfiqe.test",
          handle: body.handle ?? "ava",
          avatarUrl: null,
          heightCm: null,
          showHeight: false,
          hideFromLeaderboards: false,
          isCreator: true,
          creatorStatus: "APPROVED",
        },
      });
    });

  it("disables Save immediately for a badly formatted handle, without calling the availability endpoint", async () => {
    const availabilityCheck = vi.fn();
    mswServer.use(
      http.get("/api/users/handle-availability", () => {
        availabilityCheck();
        return HttpResponse.json({
          success: true,
          message: "Available.",
          data: { available: true },
        });
      }),
    );

    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator({ handle: "ava" }));

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "AB");

    expect(
      screen.getByText(
        "3-20 characters, start with a letter, lowercase letters/numbers/underscores only",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(availabilityCheck).not.toHaveBeenCalled();
  });

  it("disables Save while checking a new handle, then enables it once the check reports available", async () => {
    mswServer.use(
      http.get("/api/users/handle-availability", () =>
        HttpResponse.json({ success: true, message: "Available.", data: { available: true } }),
      ),
    );

    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator({ handle: "ava" }));

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "avamartinez");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await waitFor(() => expect(screen.getByText("Username is available")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("disables Save and shows a taken message when the handle is already in use", async () => {
    mswServer.use(
      http.get("/api/users/handle-availability", () =>
        HttpResponse.json({ success: true, message: "Taken.", data: { available: false } }),
      ),
    );

    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator({ handle: "ava" }));

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "avamartinez");

    await waitFor(() =>
      expect(screen.getByText("That username is already taken")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves the new handle, updates the @handle display, and calls updateUser", async () => {
    mswServer.use(
      http.get("/api/users/handle-availability", () =>
        HttpResponse.json({ success: true, message: "Available.", data: { available: true } }),
      ),
      patchProfileWithHandle(),
    );

    const updateUser = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isAuthResolved: true,
      isBrandOwner: false,
      isAdmin: false,
      isCreator: false,
      isShopper: true,
      hasCrmAccess: false,
      state: {
        user: buildUserSession("creator-9"),
        accessToken: "test-access-token",
        status: AuthStatus.AUTHENTICATED,
      },
      dispatch: vi.fn(),
      logout: vi.fn(),
      updateUser,
    });

    const user = userEvent.setup();
    renderProfile(buildCreator({ handle: "ava" }));

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "avamartinez");

    await waitFor(() => expect(screen.getByText("Username is available")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("@avamartinez")).toBeInTheDocument();
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ handle: "avamartinez" }));
  });

  it("replaces the URL with the new handle after a successful change on the /creator/[handle] route", async () => {
    mswServer.use(
      http.get("/api/users/handle-availability", () =>
        HttpResponse.json({ success: true, message: "Available.", data: { available: true } }),
      ),
      patchProfileWithHandle(),
    );

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, pathname: "/creator/ava" },
    });

    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator({ handle: "ava" }));

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "avamartinez");

    await waitFor(() => expect(screen.getByText("Username is available")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/creator/avamartinez"));

    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("doesn't navigate after a successful change when there's no handle in the current URL", async () => {
    mswServer.use(
      http.get("/api/users/handle-availability", () =>
        HttpResponse.json({ success: true, message: "Available.", data: { available: true } }),
      ),
      patchProfileWithHandle(),
    );

    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, pathname: "/profile" },
    });

    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator({ handle: "ava" }));

    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    const handleInput = screen.getByLabelText("Username");
    await user.clear(handleInput);
    await user.type(handleInput, "avamartinez");

    await waitFor(() => expect(screen.getByText("Username is available")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();

    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });
});

describe("CreatorProfile post detail modal", () => {
  it("puts the post's ?look= url in place without a router navigation when a thumbnail is clicked", async () => {
    const user = userEvent.setup();
    renderProfile(buildCreator());

    await user.click(screen.getByRole("button", { name: "Caption p1" }));

    expect(replaceState).toHaveBeenCalledWith(null, "", "/creator/ava?look=p1");
    expect(replace).not.toHaveBeenCalled();
  });

  it("opens the post detail modal when ?look= matches an already-loaded post", () => {
    mockSearchParams({ look: "p1" });
    renderProfile(buildCreator());

    expect(screen.getByRole("dialog", { name: "Post detail" })).toBeInTheDocument();
  });

  it("clears the ?look= param when the modal is closed", async () => {
    mockSearchParams({ look: "p1" });
    const user = userEvent.setup();
    renderProfile(buildCreator());

    await user.click(screen.getByRole("button", { name: "Close detail" }));

    expect(replaceState).toHaveBeenCalledWith(null, "", "/creator/ava");
    expect(replace).not.toHaveBeenCalled();
  });

  it("fetches and shows a post that isn't already loaded in the grid (e.g. a deep link)", async () => {
    mockSearchParams({ look: "p99" });
    mswServer.use(
      http.get("/api/creator-looks/p99/public", () =>
        HttpResponse.json({ success: true, message: "Post.", data: buildPost("p99") }),
      ),
    );
    renderProfile(buildCreator());

    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Post detail" })).toBeInTheDocument(),
    );
  });
});

describe("CreatorProfile delete post flow", () => {
  it("deletes the post through the real API and decrements the posts count", async () => {
    mswServer.use(
      http.delete("/api/creator-looks/p1", () => new HttpResponse(null, { status: 204 })),
    );

    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator());

    const menuButtons = screen.getAllByRole("button", { name: "Post options" });
    await user.click(menuButtons[0] as HTMLElement);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Delete post?")).not.toBeInTheDocument());
  });

  it("cancels the delete confirmation without deleting", async () => {
    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator());

    const menuButtons = screen.getAllByRole("button", { name: "Post options" });
    await user.click(menuButtons[0] as HTMLElement);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(screen.getByText("Delete post?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Delete post?")).not.toBeInTheDocument();
  });

  it("closes the delete confirmation via its own close control", async () => {
    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator());

    const menuButtons = screen.getAllByRole("button", { name: "Post options" });
    await user.click(menuButtons[0] as HTMLElement);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Delete post?")).not.toBeInTheDocument();
  });

  it("opens the edit-post modal from the post-actions menu", async () => {
    mockAuth("creator-9");
    const user = userEvent.setup();
    renderProfile(buildCreator());

    const menuButtons = screen.getAllByRole("button", { name: "Post options" });
    await user.click(menuButtons[0] as HTMLElement);
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(screen.getByRole("dialog", { name: "Edit post" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close edit" }));
    expect(screen.queryByRole("dialog", { name: "Edit post" })).not.toBeInTheDocument();
  });

  it("opens the edit-post modal from a ?edit= deep link on the owner's own profile", () => {
    mockAuth("creator-9");
    mockSearchParams({ edit: "p1" });
    renderProfile(buildCreator());

    expect(screen.getByRole("dialog", { name: "Edit post" })).toBeInTheDocument();
  });

  it("ignores a ?edit= deep link on someone else's profile", () => {
    mockAuth("someone-else");
    mockSearchParams({ edit: "p1" });
    renderProfile(buildCreator());

    expect(screen.queryByRole("dialog", { name: "Edit post" })).not.toBeInTheDocument();
  });

  it("clears the ?edit= param when the edit modal is closed", async () => {
    mockAuth("creator-9");
    mockSearchParams({ edit: "p1" });
    const user = userEvent.setup();
    renderProfile(buildCreator());

    await user.click(screen.getByRole("button", { name: "Close edit" }));

    expect(replaceState).toHaveBeenCalledWith(null, "", "/creator/ava");
  });
});

describe("CreatorProfile pagination", () => {
  it("shows a load-more button and calls fetchNextPage when clicked", async () => {
    mockLooks({ hasNextPage: true });
    const user = userEvent.setup();
    renderProfile(buildCreator());

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it("omits the load-more button once there are no more pages", () => {
    mockLooks({ hasNextPage: false });
    renderProfile(buildCreator());

    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("shows a disabled loading state while the next page is in flight", () => {
    mockLooks({ hasNextPage: true, isFetchingNextPage: true });
    renderProfile(buildCreator());

    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
  });
});
