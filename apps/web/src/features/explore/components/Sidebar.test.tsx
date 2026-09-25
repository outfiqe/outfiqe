import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { STAFF_VIEWER_HINT_KEY } from "@/features/auth/utils/staffViewerHint";

import { useExploreAuthGate } from "../hooks/useExploreAuthGate";
import { useFollowCreator } from "../hooks/useFollowCreator";
import { useSuggestedCreators } from "../hooks/useSuggestedCreators";
import { useTrendingTags } from "../hooks/useTrendingTags";
import { Sidebar } from "./Sidebar";

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));
vi.mock("../hooks/useExploreAuthGate", () => ({
  useExploreAuthGate: vi.fn(),
}));
vi.mock("../hooks/useSuggestedCreators", () => ({
  useSuggestedCreators: vi.fn(),
}));
vi.mock("../hooks/useFollowCreator", () => ({
  useFollowCreator: vi.fn(),
}));
vi.mock("../hooks/useTrendingTags", () => ({
  useTrendingTags: vi.fn(),
}));
vi.mock("./SuggestedCreatorsModal", () => ({
  SuggestedCreatorsModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="suggested-creators-modal">
      <button type="button" onClick={onClose}>
        close-modal
      </button>
    </div>
  ),
}));

const mockAuthGate = (isAuthenticated: boolean, isAuthResolved = true) => {
  vi.mocked(useExploreAuthGate).mockReturnValue({
    isAuthenticated,
    isAuthResolved,
    viewerId: null,
    goToSignIn: vi.fn(),
    gated: vi.fn(),
  } as ReturnType<typeof useExploreAuthGate>);
};

const buildQuerySuccessResult = <TData,>(data: TData) => ({
  data,
  dataUpdatedAt: 0,
  error: null,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  errorUpdateCount: 0,
  isError: false as const,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isLoading: false as const,
  isPending: false as const,
  isLoadingError: false as const,
  isInitialLoading: false,
  isPaused: false,
  isPlaceholderData: false as const,
  isRefetchError: false as const,
  isRefetching: false,
  isStale: false,
  isSuccess: true as const,
  isEnabled: true,
  refetch: vi.fn(),
  status: "success" as const,
  fetchStatus: "idle" as const,
  promise: Promise.resolve(data),
});

const buildIdleMutationResult = () => ({
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  status: "idle" as const,
  variables: undefined,
  submittedAt: 0,
  isError: false as const,
  isIdle: true as const,
  isPending: false as const,
  isSuccess: false as const,
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
});

const buildPendingMutationResult = () => ({
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  status: "pending" as const,
  variables: { creatorId: "creator-1", following: false },
  submittedAt: 0,
  isError: false as const,
  isIdle: false as const,
  isPending: true as const,
  isSuccess: false as const,
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
});

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ isStaff: false } as ReturnType<typeof useAuth>);
  vi.mocked(useSuggestedCreators).mockReturnValue(
    buildQuerySuccessResult([]) as ReturnType<typeof useSuggestedCreators>,
  );
  vi.mocked(useFollowCreator).mockReturnValue(
    buildIdleMutationResult() as ReturnType<typeof useFollowCreator>,
  );
  vi.mocked(useTrendingTags).mockReturnValue(
    buildQuerySuccessResult([]) as ReturnType<typeof useTrendingTags>,
  );
});

afterEach(() => {
  localStorage.removeItem(STAFF_VIEWER_HINT_KEY);
});

describe("Sidebar", () => {
  it("does not show a Find more trigger for an unauthenticated visitor", () => {
    mockAuthGate(false);

    render(<Sidebar activeTag="" onTagClick={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Find more" })).not.toBeInTheDocument();
  });

  it("opens the expanded suggestions modal when Find more is clicked", async () => {
    const user = userEvent.setup();
    mockAuthGate(true);

    render(<Sidebar activeTag="" onTagClick={vi.fn()} />);
    expect(screen.queryByTestId("suggested-creators-modal")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Find more" }));

    expect(screen.getByTestId("suggested-creators-modal")).toBeInTheDocument();
  });

  it("closes the modal when it reports onClose", async () => {
    const user = userEvent.setup();
    mockAuthGate(true);

    render(<Sidebar activeTag="" onTagClick={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Find more" }));
    await user.click(screen.getByText("close-modal"));

    expect(screen.queryByTestId("suggested-creators-modal")).not.toBeInTheDocument();
  });

  it("disables a suggested creator's follow button while a follow is already in flight", () => {
    mockAuthGate(true);
    vi.mocked(useSuggestedCreators).mockReturnValue(
      buildQuerySuccessResult([
        {
          id: "creator-1",
          handle: "creator-one",
          name: "Creator One",
          followerCount: 3,
          isCreator: true,
          creatorStatus: "APPROVED",
        },
      ]) as ReturnType<typeof useSuggestedCreators>,
    );
    vi.mocked(useFollowCreator).mockReturnValue(
      buildPendingMutationResult() as ReturnType<typeof useFollowCreator>,
    );

    render(<Sidebar activeTag="" onTagClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Follow" })).toBeDisabled();
  });

  it("hides the entire creators-to-follow widget for a platform admin viewer", () => {
    mockAuthGate(true);
    vi.mocked(useAuth).mockReturnValue({ isStaff: true } as ReturnType<typeof useAuth>);
    vi.mocked(useSuggestedCreators).mockReturnValue(
      buildQuerySuccessResult([
        {
          id: "creator-1",
          handle: "creator-one",
          name: "Creator One",
          followerCount: 3,
          isCreator: true,
          creatorStatus: "APPROVED",
        },
      ]) as ReturnType<typeof useSuggestedCreators>,
    );

    render(<Sidebar activeTag="" onTagClick={vi.fn()} />);

    expect(screen.queryByText("Creators to follow")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Find more" })).not.toBeInTheDocument();
  });

  it("hides the widget immediately for a returning admin, before auth has resolved", () => {
    localStorage.setItem(STAFF_VIEWER_HINT_KEY, "1");
    mockAuthGate(false, false);
    vi.mocked(useAuth).mockReturnValue({ isStaff: false } as ReturnType<typeof useAuth>);

    render(<Sidebar activeTag="" onTagClick={vi.fn()} />);

    expect(screen.queryByText("Creators to follow")).not.toBeInTheDocument();
  });

  it("still shows the loading skeleton for a non-admin while auth is resolving", () => {
    mockAuthGate(false, false);
    vi.mocked(useAuth).mockReturnValue({ isStaff: false } as ReturnType<typeof useAuth>);

    render(<Sidebar activeTag="" onTagClick={vi.fn()} />);

    expect(screen.getByText("Creators to follow")).toBeInTheDocument();
  });
});
