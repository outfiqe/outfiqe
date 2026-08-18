import type { BaselineSourceValue } from "./schemas";

export const BASELINE_SOURCE_LABEL: Record<BaselineSourceValue, string> = {
  product: "this product's own trailing history",
  category: "similar products of the same type",
  global: "the whole catalog",
};

export const formatNumber = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });
