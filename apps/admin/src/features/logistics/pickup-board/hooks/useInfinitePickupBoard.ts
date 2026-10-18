import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { pickupBoardApi } from "../api/pickupBoardApi";
import { pickupBoardForHubQueryKey } from "../constants/pickupBoardQueryKeys";

export const useInfinitePickupBoard = (hubId: string | null) =>
  useInfiniteCursorPage(
    pickupBoardForHubQueryKey(hubId ?? ""),
    (cursor) => pickupBoardApi.listWaitingPickups(hubId ?? "", cursor),
    hubId !== null,
  );
