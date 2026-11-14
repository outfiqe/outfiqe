import type { DeliveryZone } from "@/features/delivery-zones";

const NO_THRESHOLD = 0;

export type DeliveryFeeSummary = {
  lowestFee: number;
  sharedFreeDeliveryThreshold: number | null;
};

export const summarizeDeliveryFees = (zones: DeliveryZone[]): DeliveryFeeSummary | null => {
  const [firstZone] = zones;
  if (!firstZone) return null;

  const lowestFee = Math.min(...zones.map(({ standardDeliveryFee }) => standardDeliveryFee));
  const isThresholdShared = zones.every(
    ({ freeDeliveryThreshold }) => freeDeliveryThreshold === firstZone.freeDeliveryThreshold,
  );
  const sharedFreeDeliveryThreshold =
    isThresholdShared && firstZone.freeDeliveryThreshold > NO_THRESHOLD
      ? firstZone.freeDeliveryThreshold
      : null;

  return { lowestFee, sharedFreeDeliveryThreshold };
};
