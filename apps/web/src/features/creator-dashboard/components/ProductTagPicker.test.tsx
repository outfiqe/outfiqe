import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PublicProduct } from "@/features/products/api/productSchemas";

import { ProductTagPicker } from "./ProductTagPicker";

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

const baseProps = {
  taggedProducts: [],
  maxTaggedProducts: 6,
  productCache: {},
  onToggleProduct: vi.fn(),
  onRemoveTag: vi.fn(),
  onSizeChange: vi.fn(),
  productFilter: "",
  onFilterChange: vi.fn(),
  debouncedFilter: "",
  isSearching: false,
  isSearchLoading: false,
  searchResults: [],
};

describe("ProductTagPicker", () => {
  it("shows a generic trigger label with no products tagged", () => {
    render(<ProductTagPicker {...baseProps} />);

    expect(screen.getByRole("button", { name: "Tag a product" })).toBeInTheDocument();
  });

  it("uses singular phrasing for exactly one tagged product", () => {
    render(
      <ProductTagPicker
        {...baseProps}
        taggedProducts={[{ productId: "product-1", sizeWorn: "M" }]}
      />,
    );

    expect(screen.getByRole("button", { name: "1 product tagged" })).toBeInTheDocument();
  });

  it("uses plural phrasing for more than one tagged product", () => {
    render(
      <ProductTagPicker
        {...baseProps}
        taggedProducts={[
          { productId: "product-1", sizeWorn: "M" },
          { productId: "product-2", sizeWorn: "L" },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "2 products tagged" })).toBeInTheDocument();
  });

  it("expands the picker when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductTagPicker {...baseProps} />);

    await user.click(screen.getByRole("button", { name: "Tag a product" }));

    expect(screen.getByPlaceholderText("Search products to tag…")).toBeInTheDocument();
  });

  it("renders a tagged product from the cache with a size input", async () => {
    const user = userEvent.setup();
    render(
      <ProductTagPicker
        {...baseProps}
        taggedProducts={[{ productId: "product-1", sizeWorn: "M" }]}
        productCache={{ "product-1": { name: "Denim Jacket", imageUrl: null } }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "1 product tagged" }));

    expect(screen.getByText("Denim Jacket")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Size (e.g. M)")).toHaveValue("M");
  });

  it("calls onSizeChange when the size input changes", async () => {
    const onSizeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ProductTagPicker
        {...baseProps}
        taggedProducts={[{ productId: "product-1", sizeWorn: "" }]}
        productCache={{ "product-1": { name: "Denim Jacket", imageUrl: null } }}
        onSizeChange={onSizeChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "1 product tagged" }));
    await user.type(screen.getByPlaceholderText("Size (e.g. M)"), "L");

    expect(onSizeChange).toHaveBeenCalledWith("product-1", "L");
  });

  it("calls onRemoveTag when a tagged product's remove control is clicked", async () => {
    const onRemoveTag = vi.fn();
    const user = userEvent.setup();
    render(
      <ProductTagPicker
        {...baseProps}
        taggedProducts={[{ productId: "product-1", sizeWorn: "M" }]}
        productCache={{ "product-1": { name: "Denim Jacket", imageUrl: null } }}
        onRemoveTag={onRemoveTag}
      />,
    );

    await user.click(screen.getByRole("button", { name: "1 product tagged" }));
    await user.click(screen.getByRole("button", { name: "Remove Denim Jacket tag" }));

    expect(onRemoveTag).toHaveBeenCalledWith("product-1");
  });

  it("calls onFilterChange as the search input changes", async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductTagPicker {...baseProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByRole("button", { name: "Tag a product" }));
    await user.type(screen.getByPlaceholderText("Search products to tag…"), "d");

    expect(onFilterChange).toHaveBeenCalledWith("d");
  });

  it("shows search results and calls onToggleProduct when one is selected", async () => {
    const onToggleProduct = vi.fn();
    const user = userEvent.setup();
    render(
      <ProductTagPicker
        {...baseProps}
        isSearching
        debouncedFilter="denim"
        searchResults={[buildProduct()]}
        onToggleProduct={onToggleProduct}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tag a product" }));
    await user.click(screen.getByRole("option", { name: /Denim Jacket/ }));

    expect(onToggleProduct).toHaveBeenCalledWith(buildProduct());
  });

  it("marks an already-tagged search result", async () => {
    const user = userEvent.setup();
    render(
      <ProductTagPicker
        {...baseProps}
        taggedProducts={[{ productId: "product-1", sizeWorn: "M" }]}
        productCache={{ "product-1": { name: "Denim Jacket", imageUrl: null } }}
        isSearching
        debouncedFilter="denim"
        searchResults={[buildProduct()]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "1 product tagged" }));

    expect(screen.getByLabelText("Tagged")).toBeInTheDocument();
  });

  it("shows loading placeholders while searching", async () => {
    const user = userEvent.setup();
    render(<ProductTagPicker {...baseProps} isSearching debouncedFilter="denim" isSearchLoading />);

    await user.click(screen.getByRole("button", { name: "Tag a product" }));

    expect(screen.queryByText(/No products found/)).not.toBeInTheDocument();
  });

  it("shows a no-results message when the search comes back empty", async () => {
    const user = userEvent.setup();
    render(
      <ProductTagPicker {...baseProps} isSearching debouncedFilter="zzz" searchResults={[]} />,
    );

    await user.click(screen.getByRole("button", { name: "Tag a product" }));

    expect(screen.getByText(/No products found for.*zzz/)).toBeInTheDocument();
  });

  it("renders the validation error when given", () => {
    render(<ProductTagPicker {...baseProps} error="Add at least one product" />);

    expect(screen.getByText("Add at least one product")).toBeInTheDocument();
  });

  it("blocks tagging past the max, leaving the toggle handler untouched by the component itself", () => {
    const sixTags = Array.from({ length: 6 }, (_, index) => ({
      productId: `product-${index}`,
      sizeWorn: "M",
    }));
    render(<ProductTagPicker {...baseProps} taggedProducts={sixTags} maxTaggedProducts={6} />);

    expect(screen.getByRole("button", { name: "6 products tagged" })).toBeInTheDocument();
  });
});
