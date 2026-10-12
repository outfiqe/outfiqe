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

vi.mock("../hooks/useSizeStandards", () => ({
  useSizeStandards: () => ({
    data: [
      {
        id: "standard-letter",
        name: "Letter sizes",
        labels: [
          { id: "label-s", label: "S" },
          { id: "label-m", label: "M" },
        ],
      },
    ],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateSizeStandard: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useUpdateSizeStandard: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

vi.mock("@/features/categories/hooks/useCategories", () => ({
  useCategories: () => ({ data: [{ slug: "tops", name: "Tops" }] }),
}));

vi.mock("@/features/products/hooks/useProductTypes", () => ({
  useAssignableProductTypes: () => ({
    data: [
      { id: "type-a", slug: "type-a", label: "Type A", supportsFitRanges: true },
      { id: "type-b", slug: "type-b", label: "Type B", supportsFitRanges: true },
      { id: "type-c", slug: "type-c", label: "Bags", supportsFitRanges: false },
    ],
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
  sizeStandardId: "standard-letter",
  isStretchable: true,
  isThrift: false,
  thriftConditionRating: null,
  thriftConditionNotes: null,
  isSoldOut: false,
  ...overrides,
});

const typeSelect = () => screen.getByRole("combobox", { name: "Type" });

const pickStandardAndSize = async (sizeLabel: string) => {
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Size standard" }),
    "standard-letter",
  );
  await userEvent.click(screen.getByRole("checkbox", { name: sizeLabel }));
};

const fillRange = async (sizeLabel: string, values: [string, string, string, string]) => {
  const fieldLabels = [
    "Shortest height (cm)",
    "Tallest height (cm)",
    "Lightest weight (kg)",
    "Heaviest weight (kg)",
  ];
  for (const [index, fieldLabel] of fieldLabels.entries()) {
    await userEvent.click(
      screen.getByRole("textbox", { name: `${fieldLabel} for size ${sizeLabel}` }),
    );
    await userEvent.paste(values[index] ?? "");
  }
};

beforeEach(() => {
  updateMutate.mockClear();
});

describe("EditProductForm", () => {
  it("drops the previous type's size picks when the type changes again", async () => {
    render(<EditProductForm product={buildProduct()} onClose={vi.fn()} />);

    await userEvent.selectOptions(typeSelect(), "type-b");
    await pickStandardAndSize("S");
    await userEvent.selectOptions(typeSelect(), "type-c");

    expect(screen.queryByRole("checkbox", { name: "S" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateMutate).not.toHaveBeenCalled();
    expect(await screen.findByText("Pick a size standard", { selector: "p" })).toBeInTheDocument();
  });

  it("sends the new sizes from the picked standard with their ranges and stretch", async () => {
    render(<EditProductForm product={buildProduct()} onClose={vi.fn()} />);

    await userEvent.selectOptions(typeSelect(), "type-b");
    await pickStandardAndSize("M");
    await fillRange("M", ["160", "170", "55", "65"]);
    await userEvent.click(screen.getByRole("radio", { name: /Non-stretch/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateMutate).toHaveBeenCalledWith({
      productId: "product-1",
      input: expect.objectContaining({
        type: "type-b",
        sizeStandardId: "standard-letter",
        isStretchable: false,
        sizes: [
          {
            standardLabelId: "label-m",
            stock: 0,
            fitRange: { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 },
          },
        ],
      }),
    });
  });

  it("asks for no chart or stretch on a type that doesn't take one", async () => {
    render(<EditProductForm product={buildProduct()} onClose={vi.fn()} />);

    await userEvent.selectOptions(typeSelect(), "type-c");
    await pickStandardAndSize("S");

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Shortest height (cm) for size S" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateMutate).toHaveBeenCalledWith({
      productId: "product-1",
      input: expect.objectContaining({
        isStretchable: null,
        sizes: [{ standardLabelId: "label-s", stock: 0, fitRange: null }],
      }),
    });
  });

  it("explains a half-filled range and doesn't save it", async () => {
    render(<EditProductForm product={buildProduct()} onClose={vi.fn()} />);

    await userEvent.selectOptions(typeSelect(), "type-b");
    await pickStandardAndSize("M");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Shortest height (cm) for size M" }),
      "160",
    );

    expect(
      screen.getByText("Fill in all four numbers, or leave them all empty."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it("leaves sizes alone when the type doesn't change", async () => {
    render(<EditProductForm product={buildProduct()} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateMutate).toHaveBeenCalledWith({
      productId: "product-1",
      input: expect.not.objectContaining({ sizes: expect.anything() }),
    });
    expect(updateMutate).toHaveBeenCalledWith({
      productId: "product-1",
      input: expect.objectContaining({ isStretchable: true }),
    });
    expect(screen.queryByRole("combobox", { name: "Size standard" })).not.toBeInTheDocument();
  });
});
