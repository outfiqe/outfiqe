import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SizeChartTable } from "./SizeChartTable";
import { StretchBadge } from "./StretchBadge";

const sizes = [
  {
    id: "size-m",
    label: "M",
    fitRange: { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 },
  },
  { id: "size-l", label: "L", fitRange: null },
];

describe("SizeChartTable", () => {
  it("lists each size with its height and weight range", () => {
    render(<SizeChartTable sizes={sizes} caption="Size chart for Linen Kurta" />);

    const chart = screen.getByRole("table", { name: "Size chart for Linen Kurta" });
    const mediumRow = within(chart).getByText("M").closest("tr");
    expect(mediumRow).toHaveTextContent("160–170");
    expect(mediumRow).toHaveTextContent("55–65");
  });

  it("shows a dash for a size without a range", () => {
    render(<SizeChartTable sizes={sizes} caption="Size chart" />);

    expect(screen.getByText("L").closest("tr")).toHaveTextContent("—");
  });

  it("highlights the recommended size", () => {
    render(<SizeChartTable sizes={sizes} caption="Size chart" highlightedSizeId="size-l" />);

    expect(screen.getByText("L").closest("tr")).toHaveClass("bg-primary/10");
    expect(screen.getByText("M").closest("tr")).not.toHaveClass("bg-primary/10");
  });

  it("says so when there are no sizes", () => {
    render(<SizeChartTable sizes={[]} caption="Size chart" />);

    expect(screen.getByText("No sizes yet.")).toBeInTheDocument();
  });
});

describe("StretchBadge", () => {
  it.each([
    [true, "Stretchable fabric"],
    [false, "Non-stretch fabric"],
  ])("labels stretch %s as %s", (isStretchable, label) => {
    render(<StretchBadge isStretchable={isStretchable} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("shows nothing when the brand hasn't said", () => {
    const { container } = render(<StretchBadge isStretchable={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
