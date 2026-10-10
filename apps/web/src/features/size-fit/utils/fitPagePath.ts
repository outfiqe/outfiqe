import type { FitMeasurements } from "@outfiqe/utils";

export const FIT_PAGE_PATH = "/fit";

export const buildFitPagePath = (
  { heightCm, weightKg }: FitMeasurements,
  type?: string,
): string => {
  const params = new URLSearchParams({ heightCm: String(heightCm), weightKg: String(weightKg) });
  if (type) params.set("type", type);
  return `${FIT_PAGE_PATH}?${params.toString()}`;
};
