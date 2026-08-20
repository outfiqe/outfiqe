import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicProduct } from "@/features/products/api/productSchemas";

import { useTaggableProducts } from "../hooks/useTaggableProducts";
import { ShareProductPicker } from "./ShareProductPicker";

vi.mock("../hooks/useTaggableProducts", () => ({
  useTaggableProducts: vi.fn(),
}));

const buildProduct = (overrides: Partial<PublicProduct> = {}): PublicProduct => ({
  id: "product-1",
  brand: "Studio Nine",
  name: "Denim Jacket",
  price: 4500,
  type: "tops",
  categorySlugs: [],
  imageUrl: null,
  lowStock: false,
  isNew: false,
  creatorBuyerCount: 0,
  unitsSold: 0,
  ...overrides,
});

const mockTaggableProducts = (overrides: Partial<ReturnType<typeof useTaggableProducts>> = {}) => {
  vi.mocked(useTaggableProducts).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useTaggableProducts>);
};

beforeEach(() => {
  mockTaggableProducts();
});

describe("ShareProductPicker", () => {
  it("shows the search input when nothing is selected", () => {
    render(<ShareProductPicker selectedProduct={null} onSelect={vi.fn()} />);

    expect(screen.getByPlaceholderText("Search a product to share…")).toBeInTheDocument();
  });

  it("shows the selected product instead of the search input", () => {
    render(<ShareProductPicker selectedProduct={buildProduct()} onSelect={vi.fn()} />);

    expect(screen.getByText("Denim Jacket")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search a product to share…")).not.toBeInTheDocument();
  });

  it("clears the selection when the clear button is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ShareProductPicker selectedProduct={buildProduct()} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Clear selected product" }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("shows matching results once a query is typed", async () => {
    mockTaggableProducts({
      data: { products: [buildProduct()], nextCursor: null, total: 1, brandCount: 1 },
    });
    const user = userEvent.setup();
    render(<ShareProductPicker selectedProduct={null} onSelect={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Search a product to share…"), "denim");

    expect(await screen.findByRole("option", { name: /Denim Jacket/ })).toBeInTheDocument();
  });

  it("calls onSelect with the chosen product", async () => {
    mockTaggableProducts({
      data: { products: [buildProduct()], nextCursor: null, total: 1, brandCount: 1 },
    });
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ShareProductPicker selectedProduct={null} onSelect={onSelect} />);

    await user.type(screen.getByPlaceholderText("Search a product to share…"), "denim");
    await user.click(await screen.findByRole("option", { name: /Denim Jacket/ }));

    expect(onSelect).toHaveBeenCalledWith(buildProduct());
  });

  it("shows an empty-results message when nothing matches", async () => {
    mockTaggableProducts({ data: { products: [], nextCursor: null, total: 0, brandCount: 0 } });
    const user = userEvent.setup();
    render(<ShareProductPicker selectedProduct={null} onSelect={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Search a product to share…"), "zzz");

    expect(await screen.findByText(/No products found for/)).toBeInTheDocument();
  });
});
