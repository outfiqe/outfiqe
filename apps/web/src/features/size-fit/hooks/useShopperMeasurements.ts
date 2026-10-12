"use client";

import type { FitMeasurements } from "@outfiqe/utils";
import { useSyncExternalStore } from "react";

import { readDeviceMeasurements } from "../utils/deviceMeasurements";
import { useFitProfile } from "./useFitProfile";

const subscribeToStorage = (onStorageChange: () => void): (() => void) => {
  window.addEventListener("storage", onStorageChange);
  return () => window.removeEventListener("storage", onStorageChange);
};

const SNAPSHOT_SEPARATOR = "|";

const readDeviceMeasurementsSnapshot = (): string | null => {
  const deviceMeasurements = readDeviceMeasurements();
  return deviceMeasurements
    ? `${deviceMeasurements.heightCm}${SNAPSHOT_SEPARATOR}${deviceMeasurements.weightKg}`
    : null;
};

const readServerSnapshot = (): string | null => null;

const parseMeasurementsSnapshot = (snapshot: string | null): FitMeasurements | null => {
  if (!snapshot) return null;
  const [heightCm, weightKg] = snapshot.split(SNAPSHOT_SEPARATOR).map(Number);
  return heightCm === undefined || weightKg === undefined ? null : { heightCm, weightKg };
};

export const useShopperMeasurements = (): FitMeasurements | null => {
  const { data: accountMeasurements } = useFitProfile();
  const deviceSnapshot = useSyncExternalStore(
    subscribeToStorage,
    readDeviceMeasurementsSnapshot,
    readServerSnapshot,
  );
  return accountMeasurements ?? parseMeasurementsSnapshot(deviceSnapshot);
};
