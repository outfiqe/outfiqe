"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
const MINI_HEIGHT = 56;
const AREA_FILL_TOP_OPACITY = 0.28;
const AREA_FILL_BOTTOM_OPACITY = 0.02;
const LINE_STROKE_WIDTH = 2;
const Y_AXIS_WIDTH = 44;
const MIN_TICK_GAP = 24;
const DEFAULT_MARGIN = { top: 8, right: 12, bottom: 0, left: 0 } as const;
const MINI_MARGIN = { top: 4, right: 4, bottom: 4, left: 4 } as const;

export type TrendChartSeries = {
  readonly dataKey: string;
  readonly label: ReactNode;
  readonly color?: string;
};

export type TrendChartPoint = Record<string, number | string>;

type TrendChartProps = {
  readonly data: readonly TrendChartPoint[];
  readonly xKey: string;
  readonly series: readonly TrendChartSeries[];
  readonly variant?: "line" | "area";
  readonly size?: "default" | "mini";
  readonly height?: number;
  readonly showLegend?: boolean;
  readonly formatXTick?: (value: string | number) => string;
  readonly formatYTick?: (value: number) => string;
  readonly formatTooltipValue?: (value: number | string) => string;
  readonly formatTooltipLabel?: (label: ReactNode) => ReactNode;
};

const buildConfig = (series: readonly TrendChartSeries[]): ChartConfig =>
  Object.fromEntries(
    series.map((entry, index) => [
      entry.dataKey,
      { label: entry.label, color: entry.color ?? seriesColorAt(index) },
    ]),
  );

export const TrendChart = ({
  data,
  xKey,
  series,
  variant = "line",
  size = "default",
  height,
  showLegend = false,
  formatXTick,
  formatYTick,
  formatTooltipValue,
  formatTooltipLabel,
}: TrendChartProps) => {
  const gradientId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const isMini = size === "mini";
  const config = buildConfig(series);
  const resolvedHeight = height ?? (isMini ? MINI_HEIGHT : DEFAULT_HEIGHT);
  const margin = isMini ? MINI_MARGIN : DEFAULT_MARGIN;
  const points = [...data];

  const axesAndOverlays = isMini ? null : (
    <>
      <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey={xKey}
        tick={CHART_AXIS_TICK}
        tickLine={false}
        axisLine={{ stroke: CHART_GRID_COLOR }}
        tickFormatter={formatXTick}
        minTickGap={MIN_TICK_GAP}
      />
      <YAxis
        width={Y_AXIS_WIDTH}
        tick={CHART_AXIS_TICK}
        tickLine={false}
        axisLine={false}
        tickFormatter={formatYTick}
      />
      <Tooltip
        cursor={{ stroke: CHART_GRID_COLOR }}
        content={
          <ChartTooltipContent
            config={config}
            formatValue={formatTooltipValue}
            formatLabel={formatTooltipLabel}
          />
        }
      />
      {showLegend && <Legend content={<ChartLegendContent config={config} />} />}
    </>
  );

  return (
    <ChartContainer config={config} height={resolvedHeight}>
      {variant === "area" ? (
        <AreaChart data={points} margin={margin}>
          <defs>
            {series.map((entry, index) => {
              const color = entry.color ?? seriesColorAt(index);
              return (
                <linearGradient
                  key={entry.dataKey}
                  id={`${gradientId}-${entry.dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={AREA_FILL_TOP_OPACITY} />
                  <stop offset="100%" stopColor={color} stopOpacity={AREA_FILL_BOTTOM_OPACITY} />
                </linearGradient>
              );
            })}
          </defs>
          {axesAndOverlays}
          {series.map((entry, index) => (
            <Area
              key={entry.dataKey}
              type="monotone"
              dataKey={entry.dataKey}
              stroke={entry.color ?? seriesColorAt(index)}
              strokeWidth={LINE_STROKE_WIDTH}
              fill={`url(#${gradientId}-${entry.dataKey})`}
              isAnimationActive={false}
              dot={false}
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={points} margin={margin}>
          {axesAndOverlays}
          {series.map((entry, index) => (
            <Line
              key={entry.dataKey}
              type="monotone"
              dataKey={entry.dataKey}
              stroke={entry.color ?? seriesColorAt(index)}
              strokeWidth={LINE_STROKE_WIDTH}
              isAnimationActive={false}
              dot={false}
            />
          ))}
        </LineChart>
      )}
    </ChartContainer>
  );
};
