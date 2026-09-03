"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";

import {
  CHART_AXIS_TICK,
  CHART_GRID_COLOR,
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  seriesColorAt,
} from "./chart";

const DEFAULT_HEIGHT = 260;
const BAR_CORNER_RADIUS = 6;
const CATEGORY_AXIS_WIDTH = 128;
const VALUE_AXIS_WIDTH = 44;
const DEFAULT_MARGIN = { top: 8, right: 12, bottom: 0, left: 0 } as const;

export type BarSeriesEntry = {
  readonly dataKey: string;
  readonly label: ReactNode;
  readonly color?: string;
};

export type BarSeriesPoint = Record<string, number | string>;

type BarSeriesProps = {
  readonly data: readonly BarSeriesPoint[];
  readonly categoryKey: string;
  readonly series: readonly BarSeriesEntry[];
  readonly orientation?: "column" | "bar";
  readonly stacked?: boolean;
  readonly height?: number;
  readonly showLegend?: boolean;
  readonly formatValue?: (value: number | string) => string;
  readonly formatCategory?: (value: string | number) => string;
};

const buildConfig = (series: readonly BarSeriesEntry[]): ChartConfig =>
  Object.fromEntries(
    series.map((entry, index) => [
      entry.dataKey,
      { label: entry.label, color: entry.color ?? seriesColorAt(index) },
    ]),
  );

export const BarSeries = ({
  data,
  categoryKey,
  series,
  orientation = "column",
  stacked = false,
  height,
  showLegend = false,
  formatValue,
  formatCategory,
}: BarSeriesProps) => {
  const isHorizontal = orientation === "bar";
  const config = buildConfig(series);
  const resolvedHeight = height ?? DEFAULT_HEIGHT;
  const points = [...data];
  const stackId = stacked ? "stack" : undefined;

  const categoryAxisProps = {
    dataKey: categoryKey,
    tick: CHART_AXIS_TICK,
    tickLine: false,
    axisLine: { stroke: CHART_GRID_COLOR },
    tickFormatter: formatCategory,
  } as const;

  const valueAxisProps = {
    tick: CHART_AXIS_TICK,
    tickLine: false,
    axisLine: false,
    tickFormatter: formatValue,
  } as const;

  return (
    <ChartContainer config={config} height={resolvedHeight}>
      <BarChart
        data={points}
        layout={isHorizontal ? "vertical" : "horizontal"}
        margin={DEFAULT_MARGIN}
      >
        <CartesianGrid
          stroke={CHART_GRID_COLOR}
          strokeDasharray="3 3"
          horizontal={!isHorizontal}
          vertical={isHorizontal}
        />
        {isHorizontal ? (
          <>
            <XAxis type="number" width={VALUE_AXIS_WIDTH} {...valueAxisProps} />
            <YAxis type="category" width={CATEGORY_AXIS_WIDTH} {...categoryAxisProps} />
          </>
        ) : (
          <>
            <XAxis type="category" {...categoryAxisProps} />
            <YAxis type="number" width={VALUE_AXIS_WIDTH} {...valueAxisProps} />
          </>
        )}
        <Tooltip
          cursor={{ fill: CHART_GRID_COLOR, fillOpacity: 0.4 }}
          content={<ChartTooltipContent config={config} formatValue={formatValue} />}
        />
        {showLegend && <Legend content={<ChartLegendContent config={config} />} />}
        {series.map((entry, index) => (
          <Bar
            key={entry.dataKey}
            dataKey={entry.dataKey}
            fill={entry.color ?? seriesColorAt(index)}
            stackId={stackId}
            radius={BAR_CORNER_RADIUS}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
};
