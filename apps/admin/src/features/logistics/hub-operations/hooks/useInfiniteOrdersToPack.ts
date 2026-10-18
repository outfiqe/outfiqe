import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { hubOperationsApi } from "../api/hubOperationsApi";
import { ordersToPackQueryKey } from "../constants/hubOperationQueryKeys";

export const useInfiniteOrdersToPack = (hubId: string | null) =>
  useInfiniteCursorPage(
    ordersToPackQueryKey(hubId),
    (cursor) => hubOperationsApi.listOrdersToPack(hubId ?? "", cursor),
    hubId !== null,
  );
