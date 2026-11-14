import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrdersListBody } from "./OrdersListBody";

type OrderStub = { id: string };

type OrdersResultStub = {
  data?: { pages: { orders: OrderStub[] }[] };
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};

const buildOrdersResult = (): OrdersResultStub => ({
  isLoading: false,
  isError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
});

const mocks = vi.hoisted(() => {
  const state: { ordersResult?: OrdersResultStub } = {};
  return state;
});

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isAuthResolved: true,
    isBrandOwner: false,
    isStaff: false,
  }),
}));

vi.mock("@/features/auth", () => ({ NotAShopperNotice: () => null }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../hooks/useInfiniteOrders", () => ({ useInfiniteOrders: () => mocks.ordersResult }));

vi.mock("./OrderRow", () => ({
  OrderRow: ({ order }: { order: OrderStub }) => <p>Order {order.id}</p>,
}));

beforeEach(() => {
  mocks.ordersResult = buildOrdersResult();
});

describe("OrdersListBody load failure", () => {
  it("says the orders could not load instead of telling a buyer they have none", () => {
    const failedLoad = { ...buildOrdersResult(), isError: true };
    mocks.ordersResult = failedLoad;
    render(<OrdersListBody />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your orders.");
    expect(screen.queryByText(/when you buy something/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(failedLoad.refetch).toHaveBeenCalledOnce();
  });

  it("keeps the orders already shown when a later page fails", () => {
    mocks.ordersResult = {
      ...buildOrdersResult(),
      data: { pages: [{ orders: [{ id: "a1" }] }] },
      isError: true,
    };
    render(<OrdersListBody />);

    expect(screen.getByText("Order a1")).toBeInTheDocument();
    expect(
      screen.queryByText("We couldn't load your orders.", { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("still shows the empty state for a buyer with no orders", () => {
    mocks.ordersResult = { ...buildOrdersResult(), data: { pages: [{ orders: [] }] } };
    render(<OrdersListBody />);

    expect(screen.getByText(/when you buy something/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
