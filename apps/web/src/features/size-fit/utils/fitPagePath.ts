import type { FitMeasurements } from "@outfiqe/utils";

export const FIT_PAGE_PATH = "/fit";

export const buildFitPagePath = ({ heightCm, weightKg }: FitMeasurements): string =>
  `${FIT_PAGE_PATH}?${new URLSearchParams({
    heightCm: String(heightCm),
    weightKg: String(weightKg),
  }).toString()}`;
