import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SizeStandard } from "../api/sizeStandardSchemas";
import { ProductSizesSection } from "./ProductSizesSection";

const createMutate = vi.fn();
let standards: SizeStandard[] = [];

vi.mock("../hooks/useSizeStandards", () => ({
  useSizeStandards: () => ({
    data: standards,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateSizeStandard: () => ({ mutateAsync: createMutate, isPending: false, error: null }),
  useUpdateSizeStandard: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

const renderSection = (overrides: Partial<ComponentProps<typeof ProductSizesSection>> = {}) => {
  const callbacks = {
    onSizeStandardChange: vi.fn(),
    onSizesChange: vi.fn(),
    onStretchChange: vi.fn(),
  };
  render(
    <ProductSizesSection
      sizeStandardId=""
      sizes={[]}
      isStretchable={null}
      supportsFitRanges
      {...callbacks}
      {...overrides}
    />,
  );
  return callbacks;
};

const letterStandard: SizeStandard = {
  id: "standard-1",
  name: "Letter",
  labels: [{ id: "label-m", label: "M" }],
};

beforeEach(() => {
  standards = [];
  createMutate.mockReset();
});

describe("ProductSizesSection", () => {
  it("asks a brand with no standards to set one up, then picks it", async () => {
    createMutate.mockResolvedValue({
      id: "standard-new",
      name: "Waist",
      labels: [{ id: "label-30", label: "30" }],
    });
    const { onSizeStandardChange, onSizesChange } = renderSection();

    expect(screen.getByText(/Set up the sizes you cut in/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "Waist");
    await userEvent.type(screen.getByLabelText("New size"), "30{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Create size standard" }));

    expect(onSizeStandardChange).toHaveBeenCalledWith("standard-new");
    expect(onSizesChange).toHaveBeenCalledWith([]);
  });

  it("adds a ticked size with an empty range and no stock", async () => {
    standards = [letterStandard];
    const { onSizesChange } = renderSection({ sizeStandardId: "standard-1" });

    await userEvent.click(screen.getByRole("checkbox", { name: "M" }));

    expect(onSizesChange).toHaveBeenCalledWith([
      {
        standardLabelId: "label-m",
        label: "M",
        stock: 0,
        fitRange: { minHeightCm: "", maxHeightCm: "", minWeightKg: "", maxWeightKg: "" },
      },
    ]);
  });

  it("opens the editor for another standard from the picker", async () => {
    standards = [letterStandard];
    renderSection({ sizeStandardId: "standard-1" });

    await userEvent.click(screen.getByRole("button", { name: "New size standard" }));

    expect(screen.getByText("Create a new size standard for this product.")).toBeInTheDocument();
  });

  it("hides the stretch choice for a type without size charts", () => {
    standards = [letterStandard];
    renderSection({ sizeStandardId: "standard-1", supportsFitRanges: false });

    expect(screen.getByText("Sizes and stock")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
