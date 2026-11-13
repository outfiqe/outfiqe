import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CartBody } from "./CartBody";

type CartResultStub = {
  data?: { items: unknown[] };
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const mocks = vi.hoisted(() => {
  const cartResult: CartResultStub = { isLoading: false, isError: false, refetch: vi.fn() };
  return { cartResult };
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

vi.mock("../hooks/useCart", () => ({ useCart: () => mocks.cartResult }));

beforeEach(() => {
  mocks.cartResult = { isLoading: false, isError: false, refetch: vi.fn() };
});

describe("CartBody load failure", () => {
  it("says the bag could not load, never that it is empty, and retries on request", () => {
    mocks.cartResult.isError = true;
    render(<CartBody />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your bag.");
    expect(screen.queryByText(/your bag is empty/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.cartResult.refetch).toHaveBeenCalledOnce();
  });

  it("still shows the empty bag when the cart loaded with nothing in it", () => {
    mocks.cartResult.data = { items: [] };
    render(<CartBody />);

    expect(screen.getByText(/your bag is empty/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
