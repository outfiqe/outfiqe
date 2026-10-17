import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { ridersApi } from "../api/ridersApi";
import { ridersForHubQueryKey } from "../constants/riderQueryKeys";

export const useInfiniteRiders = (hubId: string | null) =>
  useInfiniteCursorPage(
    ridersForHubQueryKey(hubId ?? ""),
    (cursor) => ridersApi.list(hubId ?? "", cursor),
    hubId !== null,
  );
