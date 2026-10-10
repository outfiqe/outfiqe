import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrandProduct } from "../api/brandProductsSchemas";
import { EditProductForm } from "./EditProductForm";

const updateMutate = vi.fn().mockResolvedValue(undefined);

vi.mock("../hooks/useUpdateProduct", () => ({
  useUpdateProduct: () => ({
    mutateAsync: updateMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/features/categories/hooks/useCategories", () => ({
  useCategories: () => ({ data: [{ slug: "tops", name: "Tops" }] }),
}));

vi.mock("@/features/products/hooks/useProductTypes", () => ({
  useProductTypes: () => ({
    data: [
      { id: "type-a", slug: "type-a", label: "Type A" },
      { id: "type-b", slug: "type-b", label: "Type B" },
      { id: "type-c", slug: "type-c", label: "Type C" },
    ],
  }),
}));

vi.mock("@/features/products/hooks/useSizeOptions", () => ({
  useSizeOptions: (type: string) => ({
    data:
      type === "type-b"
        ? [{ id: "size-b-1", type, label: "B Small", sortOrder: 0 }]
        : type === "type-c"
          ? [{ id: "size-c-1", type, label: "C Small", sortOrder: 0 }]
          : [],
  }),
}));

vi.mock("@outfiqe/design-system", async () => {
  const actual = await vi.importActual("@outfiqe/design-system");
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

const buildProduct = (overrides: Partial<BrandProduct> = {}): BrandProduct => ({
  id: "product-1",
  name: "Denim Jacket",
  price: 2_000,
  effectivePrice: 2_000,
  activeDiscount: null,
  type: "type-a",
  categories: ["Tops"],
  categorySlugs: ["tops"],
  imageUrl: null,
  imageUrls: [],
  lowStock: false,
  status: "APPROVED",
  createdAt: new Date().toISOString(),
  sizes: [],
  isThrift: false,
  thriftConditionRating: null,
  thriftConditionNotes: null,
  isSoldOut: false,
  ...overrides,
});

beforeEach(() => {
  updateMutate.mockClear();
});

describe("EditProductForm", () => {
  it("does not carry a previous type's stale size picks into a later type change", async () => {
    render(<EditProductForm product={buildProduct()} onClose={vi.fn()} />);
    const typeSelect = screen.getAllByRole("combobox")[0]!;

    await userEvent.selectOptions(typeSelect, "type-b");
    await userEvent.click(screen.getByLabelText("B Small"));

    await userEvent.selectOptions(typeSelect, "type-c");

    expect(screen.queryByLabelText("B Small")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateMutate).not.toHaveBeenCalled();
    expect(await screen.findByText("Add at least one size for the new type")).toBeInTheDocument();
  });

  it("submits only the freshly picked sizes for the newly selected type", async () => {
    render(<EditProductForm product={buildProduct()} onClose={vi.fn()} />);
    const typeSelect = screen.getAllByRole("combobox")[0]!;

    await userEvent.selectOptions(typeSelect, "type-c");
    await userEvent.click(screen.getByLabelText("C Small"));

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateMutate).toHaveBeenCalledWith({
      productId: "product-1",
      input: expect.objectContaining({
        type: "type-c",
        sizes: [{ sizeOptionId: "size-c-1", stock: 0 }],
      }),
    });
  });
});
