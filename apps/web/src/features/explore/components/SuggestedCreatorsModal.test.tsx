import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import type { SuggestedCreator } from "../api/exploreFeedSchemas";
import { useFollowCreator } from "../hooks/useFollowCreator";
import { useInfiniteSuggestedCreators } from "../hooks/useInfiniteSuggestedCreators";
import { SuggestedCreatorsModal } from "./SuggestedCreatorsModal";

vi.mock("../hooks/useInfiniteSuggestedCreators", () => ({
  useInfiniteSuggestedCreators: vi.fn(),
}));

vi.mock("../hooks/useFollowCreator", () => ({
  useFollowCreator: vi.fn(),
}));

vi.mock("@/shared/hooks/useLoadMoreOnVisible", () => ({
  useLoadMoreOnVisible: vi.fn(),
}));

const buildCreator = (id: string): SuggestedCreator => ({
  id,
  name: `Creator ${id}`,
  handle: `creator-${id}`,
  isCreator: true,
  creatorStatus: "APPROVED",
  followerCount: 10,
});

const mockInfiniteSuggestedCreators = (
  overrides: Partial<ReturnType<typeof useInfiniteSuggestedCreators>>,
) => {
  vi.mocked(useInfiniteSuggestedCreators).mockReturnValue({
    data: undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useInfiniteSuggestedCreators>);
};

const mutateMock = vi.fn();

const buildIdleMutationResult = (mutate: typeof mutateMock) => ({
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
  mutate,
  mutateAsync: vi.fn(),
  reset: vi.fn(),
});

beforeEach(() => {
  vi.mocked(useLoadMoreOnVisible).mockReturnValue(createRef<HTMLDivElement>());
  vi.mocked(useFollowCreator).mockReturnValue(
    buildIdleMutationResult(mutateMock) as ReturnType<typeof useFollowCreator>,
  );
  mutateMock.mockClear();
});

describe("SuggestedCreatorsModal", () => {
  it("shows loading skeletons while the first page is loading", () => {
    mockInfiniteSuggestedCreators({ isLoading: true });

    render(<SuggestedCreatorsModal onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows an empty state when there are no suggestions", () => {
    mockInfiniteSuggestedCreators({
      data: { pages: [{ creators: [], nextCursor: null }], pageParams: [undefined] },
    });

    render(<SuggestedCreatorsModal onClose={vi.fn()} />);

    expect(screen.getByText("No suggestions right now.")).toBeInTheDocument();
  });

  it("renders a row for every creator across all fetched pages", () => {
    mockInfiniteSuggestedCreators({
      data: {
        pages: [
          { creators: [buildCreator("1"), buildCreator("2")], nextCursor: "c2" },
          { creators: [buildCreator("3")], nextCursor: null },
        ],
        pageParams: [undefined, "c2"],
      },
    });

    render(<SuggestedCreatorsModal onClose={vi.fn()} />);

    expect(screen.getByText("Creator 1")).toBeInTheDocument();
    expect(screen.getByText("Creator 2")).toBeInTheDocument();
    expect(screen.getByText("Creator 3")).toBeInTheDocument();
  });

  it("follows a creator when its Follow button is clicked", async () => {
    const user = userEvent.setup();
    mockInfiniteSuggestedCreators({
      data: {
        pages: [{ creators: [buildCreator("1")], nextCursor: null }],
        pageParams: [undefined],
      },
    });

    render(<SuggestedCreatorsModal onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Follow" }));

    expect(mutateMock).toHaveBeenCalledWith({ creatorId: "1", following: false });
  });

  it("enables the load-more sentinel only when there's a next page and nothing in flight", () => {
    mockInfiniteSuggestedCreators({
      data: {
        pages: [{ creators: [buildCreator("1")], nextCursor: "c1" }],
        pageParams: [undefined],
      },
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<SuggestedCreatorsModal onClose={vi.fn()} />);

    expect(vi.mocked(useLoadMoreOnVisible)).toHaveBeenCalledWith(expect.any(Function), true);
  });

  it("calls onClose when the modal is dismissed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockInfiniteSuggestedCreators({
      data: { pages: [{ creators: [], nextCursor: null }], pageParams: [undefined] },
    });

    render(<SuggestedCreatorsModal onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });
});
