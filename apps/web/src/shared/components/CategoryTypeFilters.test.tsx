import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useProductTypes } from "@/features/products/hooks/useProductTypes";

import { CategoryTypeFilters } from "./CategoryTypeFilters";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/features/products/hooks/useProductTypes", () => ({
  useProductTypes: vi.fn(),
}));

const replace = vi.fn();

const mockProductTypes = (overrides: Partial<ReturnType<typeof useProductTypes>>) => {
  vi.mocked(useProductTypes).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useProductTypes>);
};

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  replace.mockClear();
  mockProductTypes({ isLoading: true });
});

const renderFilters = () =>
  render(<CategoryTypeFilters basePath="/shop" categorySlug="tops" activeType="all" />);

describe("CategoryTypeFilters", () => {
  it("keeps the All filter visible and shows placeholders while product types load", () => {
    mockProductTypes({ isLoading: true });

    const { container } = renderFilters();

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);
  });

  it("renders a filter per product type once loaded", () => {
    mockProductTypes({
      data: [
        { id: "pt-tshirts", slug: "tshirts", label: "T-shirts" },
        { id: "pt-shirts", slug: "shirts", label: "Shirts" },
      ],
    });

    const { container } = renderFilters();

    expect(screen.getByRole("button", { name: "T-shirts" })).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);
  });

  it("navigates with the type query param when a non-All filter is picked", async () => {
    const user = userEvent.setup();
    mockProductTypes({ data: [{ id: "pt-shirts", slug: "shirts", label: "Shirts" }] });

    renderFilters();
    await user.click(screen.getByRole("button", { name: "Shirts" }));

    expect(replace).toHaveBeenCalledWith("/shop?category=tops&type=shirts", { scroll: false });
  });

  it("omits the type param when the All filter is picked", async () => {
    const user = userEvent.setup();
    mockProductTypes({ data: [{ id: "pt-shirts", slug: "shirts", label: "Shirts" }] });

    render(<CategoryTypeFilters basePath="/shop" categorySlug="tops" activeType="shirts" />);
    await user.click(screen.getByRole("button", { name: "All" }));

    expect(replace).toHaveBeenCalledWith("/shop?category=tops", { scroll: false });
  });
});
