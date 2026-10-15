import type { DeliveryZone } from "../api/deliveryZonesSchemas";

export const formatDeliveryDays = ({
  minDeliveryDays,
  maxDeliveryDays,
}: Pick<DeliveryZone, "minDeliveryDays" | "maxDeliveryDays">): string => {
  if (minDeliveryDays === null || maxDeliveryDays === null) return " · no delivery estimate";
  return minDeliveryDays === maxDeliveryDays
    ? ` · ${minDeliveryDays} working days`
    : ` · ${minDeliveryDays}–${maxDeliveryDays} working days`;
};
