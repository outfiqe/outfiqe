import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorStatus } from "@/features/auth/types";

import {
  CommissionSource,
  CommissionStatus,
  type CreatorCommission,
} from "../api/commissionSchemas";
import { useEarningsSummary } from "../hooks/useEarningsSummary";
import { useMyEarnings } from "../hooks/useMyEarnings";
import { EarningsSection } from "./EarningsSection";

vi.mock("../hooks/useEarningsSummary", () => ({
  useEarningsSummary: vi.fn(),
}));

vi.mock("../hooks/useMyEarnings", () => ({
  useMyEarnings: vi.fn(),
}));

vi.mock("./CreatorStatusGate", () => ({
  CreatorStatusGate: ({ creatorStatus }: { creatorStatus: string }) => (
    <div>Status gate for {creatorStatus}</div>
  ),
}));

const fetchNextPage = vi.fn();

const buildCommission = (id: string): CreatorCommission => ({
  id,
  productName: `Product ${id}`,
  brandName: "Studio Nine",
  imageUrl: null,
  source: CommissionSource.TAG_CLICK,
  status: CommissionStatus.PENDING,
  amount: 500,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const mockSummary = (overrides: Partial<ReturnType<typeof useEarningsSummary>> = {}) => {
  vi.mocked(useEarningsSummary).mockReturnValue({
    data: { totalEarnings: 0, pending: 0, available: 0, paid: 0 },
    isPending: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useEarningsSummary>);
};

const mockEarnings = (overrides: Partial<ReturnType<typeof useMyEarnings>> = {}) => {
  vi.mocked(useMyEarnings).mockReturnValue({
    data: { pages: [{ items: [], nextCursor: null }], pageParams: [undefined] },
    isPending: false,
    isError: false,
    hasNextPage: false,
    fetchNextPage,
    isFetchingNextPage: false,
    ...overrides,
  } as ReturnType<typeof useMyEarnings>);
};

beforeEach(() => {
  fetchNextPage.mockClear();
  mockSummary();
  mockEarnings();
});

describe("EarningsSection", () => {
  it("shows the muse status gate instead of earnings to someone who can't earn yet", () => {
    render(<EarningsSection creatorStatus={CreatorStatus.PENDING} canEarn={false} />);

    expect(screen.getByText("Status gate for PENDING")).toBeInTheDocument();
    expect(screen.queryByText("Earnings")).not.toBeInTheDocument();
    expect(useMyEarnings).toHaveBeenCalledWith(false);
  });

  it("shows build earnings to a shopper who isn't a creator", () => {
    mockEarnings({
      data: {
        pages: [
          {
            items: [{ ...buildCommission("b1"), source: CommissionSource.OUTFIT_BUILD }],
            nextCursor: null,
          },
        ],
        pageParams: [undefined],
      },
    });

    render(<EarningsSection creatorStatus={CreatorStatus.NONE} canEarn />);

    expect(screen.getByRole("heading", { name: "Earnings" })).toBeInTheDocument();
    expect(screen.getByText("Product b1")).toBeInTheDocument();
    expect(screen.getByText(/from a build you helped make/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no earnings yet", () => {
    render(<EarningsSection creatorStatus={CreatorStatus.APPROVED} canEarn />);

    expect(
      screen.getByText("No earnings yet — tag products in your drops to start earning."),
    ).toBeInTheDocument();
  });

  it("renders a ledger row for every earning across pages", () => {
    mockEarnings({
      data: {
        pages: [
          { items: [buildCommission("c1")], nextCursor: "c1" },
          { items: [buildCommission("c2")], nextCursor: null },
        ],
        pageParams: [undefined, "c1"],
      },
    });

    render(<EarningsSection creatorStatus={CreatorStatus.APPROVED} canEarn />);

    expect(screen.getByText("Product c1")).toBeInTheDocument();
    expect(screen.getByText("Product c2")).toBeInTheDocument();
  });

  it("shows loading skeletons instead of the empty state while pending", () => {
    mockEarnings({ isPending: true });

    render(<EarningsSection creatorStatus={CreatorStatus.APPROVED} canEarn />);

    expect(
      screen.queryByText("No earnings yet — tag products in your drops to start earning."),
    ).not.toBeInTheDocument();
  });

  it("shows a load-more button that calls fetchNextPage", async () => {
    mockEarnings({
      hasNextPage: true,
      data: {
        pages: [{ items: [buildCommission("c1")], nextCursor: "c1" }],
        pageParams: [undefined],
      },
    });
    const user = userEvent.setup();
    render(<EarningsSection creatorStatus={CreatorStatus.APPROVED} canEarn />);

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it("passes the summary and its loading state through to the tiles", () => {
    mockSummary({ isPending: true, data: undefined });

    render(<EarningsSection creatorStatus={CreatorStatus.APPROVED} canEarn />);

    expect(screen.queryByText(/Rs\./)).not.toBeInTheDocument();
  });

  it("shows an error banner instead of an empty state when the ledger fails to load", () => {
    mockEarnings({ isError: true, isPending: false });

    render(<EarningsSection creatorStatus={CreatorStatus.APPROVED} canEarn />);

    expect(
      screen.getByText("We couldn't load your earnings right now. Please try again."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No earnings yet — tag products in your drops to start earning."),
    ).not.toBeInTheDocument();
  });

  it("shows an error banner instead of zeroed-out tiles when the summary fails to load", () => {
    mockSummary({ isError: true, isPending: false, data: undefined });

    render(<EarningsSection creatorStatus={CreatorStatus.APPROVED} canEarn />);

    expect(
      screen.getByText("We couldn't load your earnings summary right now. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Rs\. 0/)).not.toBeInTheDocument();
  });
});
