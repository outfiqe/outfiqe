import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMyXpTransactions } from "../hooks/useMyXpTransactions";
import { useXpProgress } from "../hooks/useXpProgress";
import { ProgressSection } from "./ProgressSection";

vi.mock("../hooks/useXpProgress", () => ({ useXpProgress: vi.fn() }));
vi.mock("../hooks/useMyXpTransactions", () => ({ useMyXpTransactions: vi.fn() }));
vi.mock("./XpMultiplierBanner", () => ({ XpMultiplierBanner: () => null }));

const progressRefetch = vi.fn();
const transactionsRefetch = vi.fn();
const fetchNextPage = vi.fn();

const mockProgress = (overrides: Partial<ReturnType<typeof useXpProgress>> = {}) => {
  vi.mocked(useXpProgress).mockReturnValue({
    data: {
      totalXp: 500,
      level: { id: "l1", level: 3, name: "Rising Star", requiredXp: 300, icon: null },
      nextLevel: { id: "l2", level: 4, name: "Trendsetter", requiredXp: 800, icon: null },
      xpToNextLevel: 300,
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: progressRefetch,
    ...overrides,
  } as ReturnType<typeof useXpProgress>);
};

const mockTransactions = (overrides: Partial<ReturnType<typeof useMyXpTransactions>> = {}) => {
  vi.mocked(useMyXpTransactions).mockReturnValue({
    data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
    isPending: false,
    isError: false,
    error: null,
    refetch: transactionsRefetch,
    hasNextPage: false,
    fetchNextPage,
    isFetchingNextPage: false,
    ...overrides,
  } as ReturnType<typeof useMyXpTransactions>);
};

const renderSection = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProgressSection />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  progressRefetch.mockClear();
  transactionsRefetch.mockClear();
  mockProgress();
  mockTransactions();
});

describe("ProgressSection", () => {
  it("shows a real error banner instead of a fake Level 1 card when progress fails to load", () => {
    mockProgress({ isError: true, error: new Error("Network error"), data: undefined });
    renderSection();

    expect(screen.getByText(/Couldn't load your progress/)).toBeInTheDocument();
    expect(screen.queryByText(/Level 1/)).not.toBeInTheDocument();
  });

  it("retries the progress fetch when Try again is clicked", async () => {
    mockProgress({ isError: true, error: new Error("Network error"), data: undefined });
    const { default: userEvent } = await import("@testing-library/user-event");
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(progressRefetch).toHaveBeenCalledTimes(1);
  });

  it("shows a real error banner instead of the empty state when the XP history fetch fails", () => {
    mockTransactions({ isError: true, error: new Error("Network error"), data: undefined });
    renderSection();

    expect(screen.getByText(/Couldn't load your XP history/)).toBeInTheDocument();
    expect(screen.queryByText(/No XP yet/)).not.toBeInTheDocument();
  });

  it("shows the empty state, not an error, when there's genuinely no XP yet", () => {
    renderSection();

    expect(screen.getByText(/No XP yet/)).toBeInTheDocument();
  });
});
