import { type StatCardDelta } from "@outfiqe/design-system";

import type { PeriodTrend } from "../api/tagReviewsSchemas";
import { MIN_SAMPLE_TO_JUDGE, TREND_WINDOW_LABEL } from "../constants/tagReviewMetrics.constants";

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const SHOW_DAYS_FROM_HOURS = 48;
const TENTHS_PER_UNIT = 10;
const SINGULAR_AMOUNT = 1;
const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
const DATE_TIME_LOCALE = "en-US";

export const pluralize = (count: number, noun: string, pluralNoun = `${noun}s`): string =>
  `${count.toLocaleString()} ${count === SINGULAR_AMOUNT ? noun : pluralNoun}`;

const roundToOneDecimal = (amount: number): number =>
  Math.round(amount * TENTHS_PER_UNIT) / TENTHS_PER_UNIT;

export const formatDuration = (hours: number | null): string => {
  if (hours === null) return "—";
  const minutes = Math.round(hours * MINUTES_PER_HOUR);
  if (minutes < SINGULAR_AMOUNT) return "under a minute";
  if (hours < SINGULAR_AMOUNT) return pluralize(minutes, "minute");
  if (hours < SHOW_DAYS_FROM_HOURS) return pluralize(hours, "hour");
  return pluralize(roundToOneDecimal(hours / HOURS_PER_DAY), "day");
};

export const formatPercent = (value: number | null): string => (value === null ? "—" : `${value}%`);

export const formatDateTime = (isoDate: string): string =>
  new Date(isoDate).toLocaleString(DATE_TIME_LOCALE, DATE_TIME_FORMAT);

export const hasEnoughToJudge = (sampleCount: number): boolean =>
  sampleCount >= MIN_SAMPLE_TO_JUDGE;

export const SPEED_VERDICT = {
  TOO_FEW: "TOO_FEW",
  ON_TARGET: "ON_TARGET",
  TOO_SLOW: "TOO_SLOW",
} as const;

export type SpeedVerdict = (typeof SPEED_VERDICT)[keyof typeof SPEED_VERDICT];

export const judgeSpeed = (
  sampleCount: number,
  typicalHours: number | null,
  targetHours: number,
): SpeedVerdict => {
  if (!hasEnoughToJudge(sampleCount) || typicalHours === null) return SPEED_VERDICT.TOO_FEW;
  return typicalHours > targetHours ? SPEED_VERDICT.TOO_SLOW : SPEED_VERDICT.ON_TARGET;
};

type TrendDirection = "higherIsBetter" | "lowerIsBetter" | "neutral";

export const buildTrendDelta = (trend: PeriodTrend, direction: TrendDirection): StatCardDelta => {
  if (trend.deltaPercent === null) {
    return { value: "No earlier week to compare", tone: "neutral" };
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
