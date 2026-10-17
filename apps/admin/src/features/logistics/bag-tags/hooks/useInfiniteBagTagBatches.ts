import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { bagTagsApi } from "../api/bagTagsApi";
import { bagTagBatchesForHubQueryKey } from "../constants/bagTagQueryKeys";

export const useInfiniteBagTagBatches = (hubId: string | null) =>
  useInfiniteCursorPage(
    bagTagBatchesForHubQueryKey(hubId ?? ""),
    (cursor) => bagTagsApi.list(hubId ?? "", cursor),
    hubId !== null,
  );
