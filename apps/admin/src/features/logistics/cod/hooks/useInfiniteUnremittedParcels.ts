import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { codApi } from "../api/codApi";
import { unremittedParcelsQueryKey } from "../constants/codQueryKeys";

export const useInfiniteUnremittedParcels = (partnerId: string | null, onlyOverdue: boolean) =>
  useInfiniteCursorPage(
    unremittedParcelsQueryKey(partnerId, onlyOverdue),
    (cursor) => codApi.listUnremittedParcels(partnerId ?? "", onlyOverdue, cursor),
    partnerId !== null,
  );
