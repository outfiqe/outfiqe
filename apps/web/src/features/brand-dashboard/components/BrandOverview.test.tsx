import type * as DesignSystem from "@outfiqe/design-system";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrandOrderItem } from "../api/brandOrdersSchemas";
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

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const buildOrderItem = (id: string): BrandOrderItem => ({
  id,
  productId: `p-${id}`,
  productName: `Product ${id}`,
  imageUrl: null,
  sizeLabel: "M",
  qty: 1,
  unitPrice: 1000,
  orderId: `order-${id}`,
  orderCreatedAt: "2026-08-01T00:00:00.000Z",
  paymentStatus: "PAID",
  fulfilmentStatus: "PLACED",
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
  recentOrders: [buildOrderItem("a"), buildOrderItem("b")],
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
