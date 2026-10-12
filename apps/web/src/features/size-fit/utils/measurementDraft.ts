import { type FitMeasurements, isMeasurementWithinBounds } from "@outfiqe/utils";

export type MeasurementDraft = {
  heightCm: string;
  weightKg: string;
};

const WHOLE_NUMBER_PATTERN = /^\d+$/;

export const EMPTY_MEASUREMENT_DRAFT: MeasurementDraft = { heightCm: "", weightKg: "" };

export const toMeasurementDraft = (measurements: FitMeasurements | null): MeasurementDraft =>
  measurements
    ? { heightCm: String(measurements.heightCm), weightKg: String(measurements.weightKg) }
    : EMPTY_MEASUREMENT_DRAFT;

export const toFitMeasurements = ({
  heightCm,
  weightKg,
}: MeasurementDraft): FitMeasurements | null => {
  const trimmedHeight = heightCm.trim();
  const trimmedWeight = weightKg.trim();
  if (!WHOLE_NUMBER_PATTERN.test(trimmedHeight) || !WHOLE_NUMBER_PATTERN.test(trimmedWeight)) {
    return null;
  }
  const measurements = { heightCm: Number(trimmedHeight), weightKg: Number(trimmedWeight) };
  return isMeasurementWithinBounds(measurements) ? measurements : null;
};
