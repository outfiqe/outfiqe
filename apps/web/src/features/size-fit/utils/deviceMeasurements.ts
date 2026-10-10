import { type FitMeasurements, isMeasurementWithinBounds } from "@outfiqe/utils";

const DEVICE_MEASUREMENTS_STORAGE_KEY = "outfiqe.fit-measurements";

const isFitMeasurements = (value: unknown): value is FitMeasurements =>
  typeof value === "object" &&
  value !== null &&
  "heightCm" in value &&
  "weightKg" in value &&
  typeof value.heightCm === "number" &&
  typeof value.weightKg === "number" &&
  isMeasurementWithinBounds({ heightCm: value.heightCm, weightKg: value.weightKg });

export const readDeviceMeasurements = (): FitMeasurements | null => {
  try {
    const storedValue = window.localStorage.getItem(DEVICE_MEASUREMENTS_STORAGE_KEY);
    if (!storedValue) return null;
    const parsedValue: unknown = JSON.parse(storedValue);
    return isFitMeasurements(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
};

export const rememberDeviceMeasurements = (measurements: FitMeasurements): void => {
  try {
    window.localStorage.setItem(DEVICE_MEASUREMENTS_STORAGE_KEY, JSON.stringify(measurements));
  } catch {
    return;
  }
};

export const forgetDeviceMeasurements = (): void => {
  try {
    window.localStorage.removeItem(DEVICE_MEASUREMENTS_STORAGE_KEY);
  } catch {
    return;
  }
};
