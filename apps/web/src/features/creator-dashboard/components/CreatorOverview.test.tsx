import type * as DesignSystem from "@outfiqe/design-system";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorStatus } from "@/features/auth/types";

import {
  CommissionSource,
  CommissionStatus,
  type CreatorCommission,
} from "../api/commissionSchemas";
import type { CreatorOverview as CreatorOverviewData } from "../api/creatorOverviewSchemas";
import { useCreatorOverview } from "../hooks/useCreatorOverview";
import { CreatorOverview } from "./CreatorOverview";

vi.mock("../hooks/useCreatorOverview", () => ({
  useCreatorOverview: vi.fn(),
}));

vi.mock("@outfiqe/design-system", async (importOriginal) => {
  const actual = await importOriginal<typeof DesignSystem>();
  return { ...actual, TrendChart: () => <div data-testid="trend-chart" /> };
});

vi.mock("./CreatorStatusGate", () => ({
  CreatorStatusGate: ({ creatorStatus }: { creatorStatus: string }) => (
    <div>Status gate for {creatorStatus}</div>
  ),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const buildCommission = (id: string): CreatorCommission => ({
  id,
  productName: `Product ${id}`,
  brandName: "Studio Nine",
  imageUrl: null,
  source: CommissionSource.TAG_CLICK,
  status: CommissionStatus.PENDING,
  amount: 500,
  createdAt: "2026-08-01T00:00:00.000Z",
});

const buildOverview = (overrides: Partial<CreatorOverviewData> = {}): CreatorOverviewData => ({
  kpis: {
    totalEarnings: 1200,
    pendingEarnings: 500,
    availableEarnings: 700,
    last30DaysEarnings: 800,
    previous30DaysEarnings: 500,
    lookCount: 4,
    followerCount: 12,
    totalLikes: 30,
  },
  trend: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    earnings: index === 29 ? 800 : 0,
    cumulativeEarnings: index === 29 ? 800 : 0,
    looks: 0,
  })),
  recentCommissions: [buildCommission("c1"), buildCommission("c2")],
  ...overrides,
});

const mockOverview = (value: Partial<ReturnType<typeof useCreatorOverview>>) => {
  vi.mocked(useCreatorOverview).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    ...value,
  } as ReturnType<typeof useCreatorOverview>);
};

beforeEach(() => {
  mockOverview({ data: buildOverview(), isPending: false });
});

describe("CreatorOverview", () => {
  it("shows the creator status gate for a non-approved creator", () => {
    render(<CreatorOverview creatorStatus={CreatorStatus.PENDING} />);

    expect(screen.getByText("Status gate for PENDING")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
  });

  it("renders the KPI row, trend chart and recent commissions for an approved creator", () => {
    render(<CreatorOverview creatorStatus={CreatorStatus.APPROVED} />);

    expect(screen.getByText("Total earnings")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,200")).toBeInTheDocument();
    expect(
      screen.getByRole("figure", { name: /commission earnings per day/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Product c1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/earnings");
  });

  it("shows the chart empty state when the creator has no earnings", () => {
    mockOverview({
      data: buildOverview({
        kpis: { ...buildOverview().kpis, totalEarnings: 0 },
        recentCommissions: [],
      }),
    });

    render(<CreatorOverview creatorStatus={CreatorStatus.APPROVED} />);

    expect(
      screen.getByText(/commission from your tagged posts will show here/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No commissions yet — tag products in your posts to start earning."),
    ).toBeInTheDocument();
  });

  it("shows an error banner when the overview fails to load", () => {
    mockOverview({ isError: true });

    render(<CreatorOverview creatorStatus={CreatorStatus.APPROVED} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn.t load your overview/i);
  });

  it("shows loading skeletons while the overview is pending", () => {
    mockOverview({ isPending: true });

    const { container } = render(<CreatorOverview creatorStatus={CreatorStatus.APPROVED} />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("Total earnings")).not.toBeInTheDocument();
  });
});
