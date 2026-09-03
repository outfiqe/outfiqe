"use client";

import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { useId } from "react";
import { ResponsiveContainer } from "recharts";

import { cn } from "./cn";

export const CHART_SERIES_TOKENS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
] as const;

export const CHART_GRID_COLOR = "hsl(var(--border))";
export const CHART_AXIS_COLOR = "hsl(var(--muted-foreground))";
export const CHART_AXIS_TICK = {
  fill: CHART_AXIS_COLOR,
  fontFamily: "inherit",
  fontSize: 12,
} as const;

const FALLBACK_SWATCH_COLOR = "hsl(var(--muted-foreground))";

export type ChartSeriesConfig = {
  readonly label: ReactNode;
  readonly color?: string;
};

export type ChartConfig = Record<string, ChartSeriesConfig>;

export const seriesColorAt = (index: number): string =>
  CHART_SERIES_TOKENS[index % CHART_SERIES_TOKENS.length] ?? CHART_SERIES_TOKENS[0];

const seriesColorCssVars = (config: ChartConfig): CSSProperties => {
  const vars: Record<string, string> = {};
  for (const [key, series] of Object.entries(config)) {
    if (series.color) vars[`--color-${key}`] = series.color;
  }
  return vars;
};

type ChartContainerProps = {
  readonly config: ChartConfig;
  readonly height: number;
  readonly className?: string;
  readonly children: ComponentProps<typeof ResponsiveContainer>["children"];
};

export const ChartContainer = ({ config, height, className, children }: ChartContainerProps) => {
  const rawId = useId();
  const chartId = `chart-${rawId.replace(/[^a-zA-Z0-9-]/g, "")}`;

  return (
    <div
      data-chart={chartId}
      className={cn("w-full text-muted-foreground", className)}
      style={{ ...seriesColorCssVars(config), height }}
    >
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
};

type TooltipEntry = {
  readonly name?: string;
  readonly value?: number | string;
  readonly dataKey?: string | number;
  readonly color?: string;
};

type ChartTooltipContentProps = {
  readonly active?: boolean;
  readonly payload?: readonly TooltipEntry[];
  readonly label?: ReactNode;
  readonly config: ChartConfig;
  readonly formatValue?: (value: number | string) => string;
  readonly formatLabel?: (label: ReactNode) => ReactNode;
};

export const ChartTooltipContent = ({
  active,
  payload,
  label,
  config,
  formatValue,
  formatLabel,
}: ChartTooltipContentProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      {label !== undefined && label !== null && (
        <p className="mb-1 font-medium text-foreground">
          {formatLabel ? formatLabel(label) : label}
        </p>
      )}
      <ul className="space-y-1">
        {payload.map((entry, index) => {
          const key = String(entry.dataKey ?? entry.name ?? index);
          const swatch = config[key]?.color ?? entry.color ?? FALLBACK_SWATCH_COLOR;
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: swatch }}
              />
              <span className="text-foreground">{config[key]?.label ?? entry.name ?? key}</span>
              <span className="ml-auto pl-4 font-medium tabular-nums text-foreground">
                {entry.value === undefined || entry.value === null
                  ? "—"
                  : formatValue
                    ? formatValue(entry.value)
                    : entry.value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type LegendEntry = {
  readonly value?: string;
  readonly dataKey?: string | number;
  readonly color?: string;
};

type ChartLegendContentProps = {
  readonly payload?: readonly LegendEntry[];
  readonly config: ChartConfig;
};

export const ChartLegendContent = ({ payload, config }: ChartLegendContentProps) => {
  if (!payload || payload.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
      {payload.map((entry, index) => {
        const key = String(entry.dataKey ?? entry.value ?? index);
        const swatch = config[key]?.color ?? entry.color ?? FALLBACK_SWATCH_COLOR;
        return (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: swatch }} />
            {config[key]?.label ?? entry.value ?? key}
          </li>
        );
      })}
    </ul>
  );
};
