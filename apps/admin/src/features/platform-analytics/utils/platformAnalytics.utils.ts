import {
  ANALYTICS_PAYMENT_METHOD_LABEL,
  DIRECT_TRAFFIC_LABEL,
  DIRECT_TRAFFIC_SOURCE,
} from "../constants/platformAnalytics.constants";

const NOTHING_TO_COMPARE = 0;
const WHOLE_SHARE = 1;

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
