import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrendChart, type TrendChartPoint, type TrendChartSeries } from "./trend-chart";

const SERIES: TrendChartSeries[] = [
  { dataKey: "earnings", label: "Earnings" },
  { dataKey: "looks", label: "Looks" },
];

const DATA: TrendChartPoint[] = [
  { date: "2026-08-01", earnings: 120, looks: 2 },
  { date: "2026-08-02", earnings: 0, looks: 0 },
  { date: "2026-08-03", earnings: 340, looks: 5 },
];

describe("TrendChart", () => {
  it("renders an SVG surface for the given data", () => {
    const { container } = render(<TrendChart data={DATA} xKey="date" series={SERIES} />);

    expect(container.querySelector("svg.recharts-surface")).toBeInTheDocument();
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(SERIES.length);
  });

  it("renders a gradient per series in area variant", () => {
    const { container } = render(
      <TrendChart data={DATA} xKey="date" series={SERIES} variant="area" />,
    );

    expect(container.querySelectorAll("linearGradient")).toHaveLength(SERIES.length);
    expect(container.querySelectorAll(".recharts-area")).toHaveLength(SERIES.length);
  });

  it("omits axes and grid in the mini size", () => {
    const { container } = render(
      <TrendChart data={DATA} xKey="date" series={[SERIES[0]]} size="mini" />,
    );

    expect(container.querySelector("svg.recharts-surface")).toBeInTheDocument();
    expect(container.querySelector(".recharts-cartesian-axis")).not.toBeInTheDocument();
    expect(container.querySelector(".recharts-cartesian-grid")).not.toBeInTheDocument();
  });

  it("applies chart series color CSS variables from config", () => {
    const { container } = render(
      <TrendChart
        data={DATA}
        xKey="date"
        series={[{ dataKey: "earnings", label: "Earnings", color: "hsl(var(--chart-2))" }]}
      />,
    );

    const chartRoot = container.querySelector<HTMLElement>("[data-chart]");
    expect(chartRoot?.style.getPropertyValue("--color-earnings")).toBe("hsl(var(--chart-2))");
  });
});
