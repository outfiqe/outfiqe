import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { orderFeeSettingsApi } from "../api";

export const ORDER_FEE_SETTINGS_HISTORY_QUERY_KEY = ["order-fee-settings-history"];

export const useOrderFeeSettingsHistory = () => {
  return useInfiniteCursorPage(ORDER_FEE_SETTINGS_HISTORY_QUERY_KEY, (cursor) =>
    orderFeeSettingsApi.listHistory(cursor),
  );
};
