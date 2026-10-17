export const PARCELS_QUERY_KEY = ["logistics-parcels"] as const;

export const parcelQueueQueryKey = (hubId: string | null, queue: string) =>
  [...PARCELS_QUERY_KEY, "queue", hubId ?? "none", queue] as const;

export const parcelDetailQueryKey = (shipmentId: string) =>
  [...PARCELS_QUERY_KEY, "detail", shipmentId] as const;

export const parcelLabelQueryKey = (shipmentId: string) =>
  [...PARCELS_QUERY_KEY, "label", shipmentId] as const;
