import type { QueryClient } from "@tanstack/react-query";

import type { DeliveryZone } from "./schemas";

export const ZONES_QUERY_KEY = ["admin-delivery-zones"];

export const upsertZoneInCache = (queryClient: QueryClient, zone: DeliveryZone): void => {
  queryClient.setQueryData<DeliveryZone[]>(ZONES_QUERY_KEY, (zones) => {
    if (!zones) return zones;
    const exists = zones.some((existing) => existing.id === zone.id);
    return exists
      ? zones.map((existing) => (existing.id === zone.id ? zone : existing))
      : [zone, ...zones];
  });
};

// setDefault flips isDefault off on the zone that previously held it — a plain upsert of the
// returned zone alone would leave that old default zone stale until the next refetch.
export const applyDefaultZoneInCache = (queryClient: QueryClient, zone: DeliveryZone): void => {
  queryClient.setQueryData<DeliveryZone[]>(ZONES_QUERY_KEY, (zones) => {
    if (!zones) return zones;
    const withoutPreviousDefault = zones.map((existing) =>
      existing.isDefault && existing.id !== zone.id ? { ...existing, isDefault: false } : existing,
    );
    const exists = withoutPreviousDefault.some((existing) => existing.id === zone.id);
    return exists
      ? withoutPreviousDefault.map((existing) => (existing.id === zone.id ? zone : existing))
      : [zone, ...withoutPreviousDefault];
  });
};

export const removeZoneFromCache = (queryClient: QueryClient, zoneId: string): void => {
  queryClient.setQueryData<DeliveryZone[]>(ZONES_QUERY_KEY, (zones) =>
    zones?.filter((zone) => zone.id !== zoneId),
  );
};
