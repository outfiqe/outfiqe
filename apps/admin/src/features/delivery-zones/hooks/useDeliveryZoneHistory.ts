import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { deliveryZonesApi } from "../api";

export const DELIVERY_ZONE_HISTORY_QUERY_KEY = ["delivery-zone-history"];

export const useDeliveryZoneHistory = () => {
  return useInfiniteCursorPage(DELIVERY_ZONE_HISTORY_QUERY_KEY, (cursor) =>
    deliveryZonesApi.listHistory(cursor),
  );
};
