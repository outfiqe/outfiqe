import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type ChartConfig, ChartLegendContent, ChartTooltipContent, seriesColorAt } from "./chart";

const CONFIG: ChartConfig = {
  earnings: { label: "Earnings", color: "hsl(var(--chart-1))" },
  looks: { label: "Looks", color: "hsl(var(--chart-2))" },
};

describe("seriesColorAt", () => {
  it("cycles through the categorical palette", () => {
    expect(seriesColorAt(0)).toBe("hsl(var(--chart-1))");
    expect(seriesColorAt(5)).toBe("hsl(var(--chart-6))");
    expect(seriesColorAt(6)).toBe("hsl(var(--chart-1))");
  });
});

describe("ChartTooltipContent", () => {
  it("renders nothing when inactive or empty", () => {
    const { container: inactive } = render(
      <ChartTooltipContent config={CONFIG} active={false} payload={[{ dataKey: "earnings" }]} />,
    );
    expect(inactive).toBeEmptyDOMElement();

    const { container: empty } = render(
      <ChartTooltipContent config={CONFIG} active payload={[]} />,
    );
    expect(empty).toBeEmptyDOMElement();
  });

  it("renders the label, each series name and a formatted value", () => {
    render(
      <ChartTooltipContent
        config={CONFIG}
        active
        label="Aug 3"
        payload={[
          { dataKey: "earnings", value: 1200 },
          { dataKey: "looks", value: 4 },
        ]}
        formatValue={(value) => `Rs. ${value}`}
        formatLabel={(label) => `On ${String(label)}`}
      />,
    );

    expect(screen.getByText("On Aug 3")).toBeInTheDocument();
    expect(screen.getByText("Earnings")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1200")).toBeInTheDocument();
    expect(screen.getByText("Looks")).toBeInTheDocument();
  });

  it("falls back to a dash for a missing value and the key for an unmapped series", () => {
    render(
      <ChartTooltipContent
        config={CONFIG}
        active
        payload={[{ dataKey: "unknown", value: undefined }]}
      />,
    );

    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("uses the payload entry's own name and color when the config has no match", () => {
    const { container } = render(
      <ChartTooltipContent
        config={{}}
        active
        payload={[{ name: "Ad-hoc series", value: 9, color: "#123456" }]}
      />,
    );

    expect(screen.getByText("Ad-hoc series")).toBeInTheDocument();
    expect(container.querySelector('[style*="rgb(18, 52, 86)"]')).toBeInTheDocument();
  });
});

describe("ChartLegendContent", () => {
  it("renders nothing without a payload", () => {
    const { container } = render(<ChartLegendContent config={CONFIG} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a labelled entry per series", () => {
    render(
      <ChartLegendContent
        config={CONFIG}
        payload={[{ dataKey: "earnings" }, { dataKey: "looks" }]}
      />,
    );

    expect(screen.getByText("Earnings")).toBeInTheDocument();
    expect(screen.getByText("Looks")).toBeInTheDocument();
  });

  it("falls back to the entry value and color when the config has no match", () => {
    const { container } = render(
      <ChartLegendContent config={{}} payload={[{ value: "Revenue", color: "#654321" }]} />,
    );

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(container.querySelector('[style*="rgb(101, 67, 33)"]')).toBeInTheDocument();
  });
});
