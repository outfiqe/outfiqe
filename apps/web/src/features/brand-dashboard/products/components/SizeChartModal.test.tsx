import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrandProduct } from "../api/brandProductsSchemas";
import { SizeChartModal } from "./SizeChartModal";

const sizeChartMutate = vi.fn();

vi.mock("../hooks/useUpdateProduct", () => ({
  useUpdateSizeChart: () => ({
    mutateAsync: sizeChartMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@outfiqe/design-system", async () => {
  const actual = await vi.importActual("@outfiqe/design-system");
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

const MODAL_FLOW_TIMEOUT_MS = 15_000;

const MEDIUM_RANGE = { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 };

const product: BrandProduct = {
  id: "product-1",
  name: "Linen Kurta",
  price: 2_000,
  effectivePrice: 2_000,
  activeDiscount: null,
  type: "kurta",
  categories: [],
  categorySlugs: [],
  imageUrl: null,
  imageUrls: [],
  lowStock: false,
  status: "APPROVED",
  createdAt: new Date().toISOString(),
  sizes: [
    { id: "size-m", label: "M", stock: 3, fitRange: MEDIUM_RANGE },
    { id: "size-l", label: "L", stock: 2, fitRange: null },
  ],
  sizeStandardId: "standard-1",
  isStretchable: true,
  isThrift: false,
  thriftConditionRating: null,
  thriftConditionNotes: null,
  isSoldOut: false,
};

const rangeInput = (fieldLabel: string, sizeLabel: string) =>
  screen.getByRole("textbox", { name: `${fieldLabel} for size ${sizeLabel}` });

const pasteInto = async (input: HTMLElement, value: string) => {
  await userEvent.click(input);
  await userEvent.paste(value);
};

const fillLargeRange = async (values: [string, string, string, string]) => {
  const [shortest, tallest, lightest, heaviest] = values;
  await pasteInto(rangeInput("Shortest height (cm)", "L"), shortest);
  await pasteInto(rangeInput("Tallest height (cm)", "L"), tallest);
  await pasteInto(rangeInput("Lightest weight (kg)", "L"), lightest);
  await pasteInto(rangeInput("Heaviest weight (kg)", "L"), heaviest);
};

beforeEach(() => {
  sizeChartMutate.mockReset().mockResolvedValue(product);
});

describe("SizeChartModal", { timeout: MODAL_FLOW_TIMEOUT_MS }, () => {
  it("starts from the saved chart and saves the edited ranges", async () => {
    const onClose = vi.fn();
    render(<SizeChartModal product={product} onClose={onClose} />);

    expect(rangeInput("Shortest height (cm)", "M")).toHaveValue("160");
    await fillLargeRange(["170", "180", "66", "76"]);
    await userEvent.click(screen.getByRole("button", { name: "Save size chart" }));

    expect(sizeChartMutate).toHaveBeenCalledWith({
      productId: "product-1",
      sizeChart: {
        isStretchable: true,
        sizes: [
          { sizeId: "size-m", fitRange: MEDIUM_RANGE },
          {
            sizeId: "size-l",
            fitRange: { minHeightCm: 170, maxHeightCm: 180, minWeightKg: 66, maxWeightKg: 76 },
          },
        ],
      },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("saves a change of fabric stretch", async () => {
    render(<SizeChartModal product={product} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("radio", { name: /Non-stretch/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save size chart" }));

    expect(sizeChartMutate).toHaveBeenCalledWith({
      productId: "product-1",
      sizeChart: expect.objectContaining({ isStretchable: false }),
    });
  });

  it("won't save while a range is half filled", async () => {
    render(<SizeChartModal product={product} onClose={vi.fn()} />);

    await userEvent.type(rangeInput("Shortest height (cm)", "L"), "170");

    expect(
      screen.getByText("Fill in all four numbers, or leave them all empty."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save size chart" })).toBeDisabled();
  });

  it("warns about a gap between neighbouring sizes", async () => {
    render(<SizeChartModal product={product} onClose={vi.fn()} />);

    await fillLargeRange(["175", "185", "66", "76"]);

    expect(
      screen.getByText(
        "Nobody between 171 and 174 cm gets a fitting size: M ends before L starts.",
      ),
    ).toBeInTheDocument();
  });

  it("stays open when saving fails", async () => {
    sizeChartMutate.mockRejectedValue(new Error("Network down"));
    const onClose = vi.fn();
    render(<SizeChartModal product={product} onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Save size chart" }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
