import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarSeries, type BarSeriesEntry, type BarSeriesPoint } from "./bar-series";

const SERIES: BarSeriesEntry[] = [{ dataKey: "openValue", label: "Open value" }];

const DATA: BarSeriesPoint[] = [
  { stage: "Lead", openValue: 4000 },
  { stage: "Qualified", openValue: 9000 },
  { stage: "Proposal", openValue: 2000 },
];

describe("BarSeries", () => {
  it("renders a bar rectangle per data point in column orientation", () => {
    const { container } = render(<BarSeries data={DATA} categoryKey="stage" series={SERIES} />);

    expect(container.querySelector("svg.recharts-surface")).toBeInTheDocument();
    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(DATA.length);
  });

  it("renders in bar (horizontal) orientation", () => {
    const { container } = render(
      <BarSeries data={DATA} categoryKey="stage" series={SERIES} orientation="bar" />,
    );

    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(DATA.length);
  });

  it("renders a legend when asked", () => {
    const { container } = render(
      <BarSeries data={DATA} categoryKey="stage" series={SERIES} showLegend />,
    );

    expect(container.querySelector(".recharts-legend-wrapper")).toBeInTheDocument();
  });
});
