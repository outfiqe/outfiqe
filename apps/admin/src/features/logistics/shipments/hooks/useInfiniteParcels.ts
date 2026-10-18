import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { parcelsApi } from "../api/parcelsApi";
import type { ParcelQueue } from "../api/parcelsSchemas";
import { parcelQueueQueryKey } from "../constants/parcelQueryKeys";

export const useInfiniteParcels = (hubId: string | null, queue: ParcelQueue) =>
  useInfiniteCursorPage(
    parcelQueueQueryKey(hubId, queue),
    (cursor) => parcelsApi.listParcels(hubId ?? "", queue, cursor),
    hubId !== null,
  );
