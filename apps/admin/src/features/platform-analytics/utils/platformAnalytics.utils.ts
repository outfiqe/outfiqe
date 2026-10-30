import type { StatCardDelta } from "@outfiqe/design-system";

import type { RankedPage } from "../api/platformAnalyticsSchemas";
import {
  ANALYTICS_PAYMENT_METHOD_LABEL,
  DIRECT_TRAFFIC_LABEL,
  DIRECT_TRAFFIC_SOURCE,
  SPEED_RATING_LABEL,
  type SpeedLimits,
} from "../constants/platformAnalytics.constants";

const NOTHING_TO_COMPARE = 0;
const WHOLE_SHARE = 1;
const SECONDS_IN_A_MINUTE = 60;
const NO_FULL_MINUTES = 0;
const MS_IN_A_SECOND = 1000;
const SECONDS_DECIMALS = 2;
const LAYOUT_SHIFT_DECIMALS = 2;
const NOT_MEASURED = "Not measured";

export const toStepShare = (persons: number, comparedTo: number): number =>
  comparedTo === NOTHING_TO_COMPARE
    ? NOTHING_TO_COMPARE
    : Math.min(persons / comparedTo, WHOLE_SHARE);

export const toTrafficSourceLabel = (source: string): string =>
  source === DIRECT_TRAFFIC_SOURCE ? DIRECT_TRAFFIC_LABEL : source;

export const toPaymentMethodLabel = (paymentMethod: string): string =>
  ANALYTICS_PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod;

export const sumValues = (values: number[]): number =>
  values.reduce((total, value) => total + value, NOTHING_TO_COMPARE);

export const toPageLabel = ({ path, productName }: RankedPage): string => productName ?? path;

export const formatSessionLength = (totalSeconds: number): string => {
  const wholeSeconds = Math.round(totalSeconds);
  const minutes = Math.floor(wholeSeconds / SECONDS_IN_A_MINUTE);
  const seconds = wholeSeconds % SECONDS_IN_A_MINUTE;
  return minutes === NO_FULL_MINUTES ? `${seconds}s` : `${minutes}m ${seconds}s`;
};

export const formatPaintTime = (milliseconds: number | null): string => {
  if (milliseconds === null) return NOT_MEASURED;
  return milliseconds < MS_IN_A_SECOND
    ? `${Math.round(milliseconds)} ms`
    : `${(milliseconds / MS_IN_A_SECOND).toFixed(SECONDS_DECIMALS)} s`;
};

export const formatLayoutShift = (layoutShift: number | null): string =>
  layoutShift === null ? NOT_MEASURED : layoutShift.toFixed(LAYOUT_SHIFT_DECIMALS);

export const toSpeedDelta = (
  measurement: number | null,
  { good, poor }: SpeedLimits,
  measurementName: string,
): StatCardDelta => {
  if (measurement === null) return { value: NOT_MEASURED, label: measurementName };
  if (measurement <= good) {
    return { value: SPEED_RATING_LABEL.GOOD, tone: "positive", label: measurementName };
  }
  return measurement <= poor
    ? { value: SPEED_RATING_LABEL.NEEDS_WORK, label: measurementName }
    : { value: SPEED_RATING_LABEL.POOR, tone: "negative", label: measurementName };
};
