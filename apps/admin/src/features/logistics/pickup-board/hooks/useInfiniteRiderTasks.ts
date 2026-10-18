import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { pickupBoardApi } from "../api/pickupBoardApi";
import { riderTasksForHubQueryKey } from "../constants/pickupBoardQueryKeys";

export const useInfiniteRiderTasks = (hubId: string | null) =>
  useInfiniteCursorPage(
    riderTasksForHubQueryKey(hubId ?? ""),
    (cursor) => pickupBoardApi.listRiderTasks(hubId ?? "", cursor),
    hubId !== null,
  );
