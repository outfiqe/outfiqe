import type * as DesignSystem from "@outfiqe/design-system";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ProductTour from "@/features/product-tour";

import type { BrandShipmentSummary } from "../api/brandFulfilmentSchemas";
import type { BrandOverview as BrandOverviewData } from "../api/brandOverviewSchemas";
import { useBrandOverview } from "../hooks/useBrandOverview";
import { BrandOverview } from "./BrandOverview";

vi.mock("../hooks/useBrandOverview", () => ({
  useBrandOverview: vi.fn(),
}));

vi.mock("@outfiqe/design-system", async (importOriginal) => {
  const actual = await importOriginal<typeof DesignSystem>();
  return { ...actual, TrendChart: () => <div data-testid="trend-chart" /> };
});

vi.mock("@/features/product-tour", async (importOriginal) => {
  const actual = await importOriginal<typeof ProductTour>();
  return { ...actual, BrandDashboardTour: () => <div data-testid="brand-dashboard-tour" /> };
});

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

const buildShipment = (id: string): BrandShipmentSummary => ({
  id,
  orderId: `order-${id}`,
  orderCreatedAt: "2026-08-01T00:00:00.000Z",
  status: "PLACED",
  carrier: null,
  trackingNumber: null,
  shippedAt: null,
  deliveredAt: null,
  cancellationRequestedAt: null,
  itemCount: 1,
  totalQty: 1,
  firstItemImageUrl: null,
  firstItemProductName: `Product ${id}`,
  shipToCity: "Kathmandu",
  orderPaymentStatus: "PAID",
  orderFulfilmentSummary: "UNFULFILLED",
});

const buildOverview = (overrides: Partial<BrandOverviewData> = {}): BrandOverviewData => ({
  kpis: {
    lifetimeRevenue: 50000,
    last30DaysRevenue: 12000,
    previous30DaysRevenue: 9000,
    availablePayout: 8000,
    pendingPayout: 2000,
    productCount: 14,
    lowStockCount: 2,
    unfulfilledItemCount: 3,
  },
  trend: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    revenue: index === 29 ? 7777 : 0,
    orderCount: index === 29 ? 4 : 0,
  })),
  recentOrders: [buildShipment("a"), buildShipment("b")],
  ...overrides,
});

const mockOverview = (value: Partial<ReturnType<typeof useBrandOverview>>) => {
  vi.mocked(useBrandOverview).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    ...value,
  } as ReturnType<typeof useBrandOverview>);
};

beforeEach(() => {
  mockOverview({ data: buildOverview(), isPending: false });
});

describe("BrandOverview", () => {
  it("renders the KPI row, revenue chart and recent orders", () => {
    render(<BrandOverview />);

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Revenue (30 days)")).toBeInTheDocument();
    expect(screen.getByText("Rs. 12,000")).toBeInTheDocument();
    expect(screen.getByText("To fulfil")).toBeInTheDocument();
    expect(
      screen.getByRole("figure", { name: /revenue from your products per day/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Product a")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/manage-orders",
    );
  });

  it("lets the brand replay the dashboard tour from the header", () => {
    render(<BrandOverview />);

    expect(screen.getByRole("link", { name: "Take the tour" })).toHaveAttribute(
      "href",
      "/overview?tour=brand-dashboard",
    );
  });

  it("marks the KPI row so the tour can point at it", () => {
    const { container } = render(<BrandOverview />);

    const kpiRow = container.querySelector('[data-tour-anchor="brand-kpis"]');
    expect(kpiRow).toContainElement(screen.getByText("Revenue (30 days)"));
  });

  it("mounts the tour once the overview has loaded", () => {
    render(<BrandOverview />);

    expect(screen.getByTestId("brand-dashboard-tour")).toBeInTheDocument();
  });

  it("does not mount the tour while loading or when the overview failed", () => {
    mockOverview({ isPending: true });
    const { rerender } = render(<BrandOverview />);
    expect(screen.queryByTestId("brand-dashboard-tour")).not.toBeInTheDocument();

    mockOverview({ isError: true });
    rerender(<BrandOverview />);

    expect(screen.queryByTestId("brand-dashboard-tour")).not.toBeInTheDocument();
  });

  it("shows a positive revenue delta when the last 30 days beat the previous 30", () => {
    mockOverview({
      data: buildOverview({
        kpis: { ...buildOverview().kpis, last30DaysRevenue: 12000, previous30DaysRevenue: 9000 },
      }),
    });

    render(<BrandOverview />);

    const delta = screen.getByText("+Rs. 3,000");
    expect(delta).toHaveClass("text-success");
    expect(screen.getByText("vs previous 30 days")).toBeInTheDocument();
  });

  it("shows a negative revenue delta with a minus sign when sales fell", () => {
    mockOverview({
      data: buildOverview({
        kpis: { ...buildOverview().kpis, last30DaysRevenue: 8000, previous30DaysRevenue: 12000 },
      }),
    });

    render(<BrandOverview />);

    expect(screen.getByText("−Rs. 4,000")).toHaveClass("text-destructive");
  });

  it("hides the revenue delta when the two windows are equal", () => {
    mockOverview({
      data: buildOverview({
        kpis: { ...buildOverview().kpis, last30DaysRevenue: 9000, previous30DaysRevenue: 9000 },
      }),
    });

    render(<BrandOverview />);

    expect(screen.queryByText("vs previous 30 days")).not.toBeInTheDocument();
  });

  it("explains how the pending payout is calculated on its hint", async () => {
    render(<BrandOverview />);

    fireEvent.focus(screen.getByRole("button", { name: "How Pending payout is calculated" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(/still maturing/i);
  });

  it("shows the chart and orders empty states when the brand has no sales", () => {
    mockOverview({
      data: buildOverview({
        kpis: { ...buildOverview().kpis, lifetimeRevenue: 0 },
        recentOrders: [],
      }),
    });

    render(<BrandOverview />);

    expect(
      screen.getByText(/revenue will show here once your products start selling/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No sales yet — they'll show up here once your products start selling."),
    ).toBeInTheDocument();
  });

  it("shows an error banner when the overview fails to load", () => {
    mockOverview({ isError: true });

    render(<BrandOverview />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn.t load your overview/i);
  });

  it("shows loading skeletons while pending", () => {
    mockOverview({ isPending: true });

    const { container } = render(<BrandOverview />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("Revenue (30 days)")).not.toBeInTheDocument();
  });
});
