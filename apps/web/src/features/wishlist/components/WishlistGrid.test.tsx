import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WishlistGrid } from "./WishlistGrid";

type WishlistResultStub = {
  data?: { pages: { products: { id: string }[] }[] };
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};

const buildWishlistResult = (): WishlistResultStub => ({
  isLoading: false,
  isError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
});

const mocks = vi.hoisted(() => {
  const state: { wishlistResult?: WishlistResultStub } = {};
  return state;
});

vi.mock("../hooks/useInfiniteWishlist", () => ({
  useInfiniteWishlist: () => mocks.wishlistResult,
}));

vi.mock("@/features/landing/components/ProductCard", () => ({ ProductCard: () => null }));

beforeEach(() => {
  mocks.wishlistResult = buildWishlistResult();
});

describe("WishlistGrid load failure", () => {
  it("says the stash could not load instead of saying it is empty", () => {
    const failedLoad = { ...buildWishlistResult(), isError: true };
    mocks.wishlistResult = failedLoad;
    render(<WishlistGrid />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your stash.");
    expect(screen.queryByText(/nothing stashed yet/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(failedLoad.refetch).toHaveBeenCalledOnce();
  });

  it("still shows the empty stash when it loaded with nothing in it", () => {
    mocks.wishlistResult = { ...buildWishlistResult(), data: { pages: [{ products: [] }] } };
    render(<WishlistGrid />);

    expect(screen.getByText(/nothing stashed yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
