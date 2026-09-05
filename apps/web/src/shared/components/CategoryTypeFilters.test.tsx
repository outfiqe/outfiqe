import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { useProductTypes } from "@/features/products/hooks/useProductTypes";

import { CategoryTypeFilters } from "./CategoryTypeFilters";

vi.mock("@/features/products/hooks/useProductTypes", () => ({
  useProductTypes: vi.fn(),
}));

const mockProductTypes = (overrides: Partial<ReturnType<typeof useProductTypes>>) => {
  vi.mocked(useProductTypes).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useProductTypes>);
};

const renderFilters = (
  overrides: Partial<{ activeType: string; isNavigating: boolean; onSelectType: () => void }> = {},
) =>
  render(
    <CategoryTypeFilters
      activeType={overrides.activeType ?? "all"}
      isNavigating={overrides.isNavigating ?? false}
      onSelectType={overrides.onSelectType ?? vi.fn()}
    />,
  );

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

  it("calls onSelectType with the picked filter's id", async () => {
    const user = userEvent.setup();
    const onSelectType = vi.fn();
    mockProductTypes({ data: [{ id: "pt-shirts", slug: "shirts", label: "Shirts" }] });

    renderFilters({ onSelectType });
    await user.click(screen.getByRole("button", { name: "Shirts" }));

    expect(onSelectType).toHaveBeenCalledWith("shirts");
  });

  it("marks the grid busy while a type selection is pending", () => {
    mockProductTypes({ data: [{ id: "pt-shirts", slug: "shirts", label: "Shirts" }] });

    const { container } = renderFilters({ isNavigating: true });

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
