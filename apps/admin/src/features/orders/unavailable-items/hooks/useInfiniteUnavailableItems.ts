import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { unavailableItemsApi } from "../api/unavailableItemsApi";
import type { UnavailableItemStatus } from "../api/unavailableItemsSchemas";
import { UNAVAILABLE_ITEMS_QUERY_KEY } from "../constants/unavailableItemLabels";

export const useInfiniteUnavailableItems = (status: UnavailableItemStatus) =>
  useInfiniteCursorPage([...UNAVAILABLE_ITEMS_QUERY_KEY, status], (cursor) =>
    unavailableItemsApi.list(status, cursor),
  );
