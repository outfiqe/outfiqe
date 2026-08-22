import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useExploreAuthGate } from "../hooks/useExploreAuthGate";
import { useFollowCreator } from "../hooks/useFollowCreator";
import { useSuggestedCreators } from "../hooks/useSuggestedCreators";
import { useTrendingTags } from "../hooks/useTrendingTags";
import { Sidebar } from "./Sidebar";

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

const mockAuthGate = (isAuthenticated: boolean) => {
  vi.mocked(useExploreAuthGate).mockReturnValue({
    isAuthenticated,
    isAuthResolved: true,
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

beforeEach(() => {
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

describe("Sidebar", () => {
  it("does not show a Find more trigger for an unauthenticated visitor", () => {
    mockAuthGate(false);

    render(<Sidebar onTagClick={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Find more" })).not.toBeInTheDocument();
  });

  it("opens the expanded suggestions modal when Find more is clicked", async () => {
    const user = userEvent.setup();
    mockAuthGate(true);

    render(<Sidebar onTagClick={vi.fn()} />);
    expect(screen.queryByTestId("suggested-creators-modal")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Find more" }));

    expect(screen.getByTestId("suggested-creators-modal")).toBeInTheDocument();
  });

  it("closes the modal when it reports onClose", async () => {
    const user = userEvent.setup();
    mockAuthGate(true);

    render(<Sidebar onTagClick={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Find more" }));
    await user.click(screen.getByText("close-modal"));

    expect(screen.queryByTestId("suggested-creators-modal")).not.toBeInTheDocument();
  });
});
