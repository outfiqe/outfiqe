import { type StatCardDelta } from "@outfiqe/design-system";

import type { PeriodTrend } from "../api/tagReviewsSchemas";
import { TREND_WINDOW_LABEL } from "../constants/tagReviewMetrics.constants";

export const formatHours = (hours: number | null): string => {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
};

export const formatPercent = (value: number | null): string => (value === null ? "—" : `${value}%`);

type TrendDirection = "higherIsBetter" | "lowerIsBetter" | "neutral";

export const buildTrendDelta = (trend: PeriodTrend, direction: TrendDirection): StatCardDelta => {
  if (trend.deltaPercent === null) {
    return { value: "Not enough history yet", tone: "neutral" };
  }
  if (trend.deltaPercent === 0) {
    return { value: "No change", tone: "neutral", label: TREND_WINDOW_LABEL };
  }

  const isIncrease = trend.deltaPercent > 0;
  const arrow = isIncrease ? "↑" : "↓";
  const isGoodChange =
    direction === "neutral" ? null : (direction === "higherIsBetter") === isIncrease;
  const tone: StatCardDelta["tone"] =
    isGoodChange === null ? "neutral" : isGoodChange ? "positive" : "negative";

  return { value: `${arrow} ${Math.abs(trend.deltaPercent)}%`, tone, label: TREND_WINDOW_LABEL };
};
