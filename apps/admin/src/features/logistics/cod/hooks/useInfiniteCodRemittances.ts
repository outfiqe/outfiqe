import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { codApi } from "../api/codApi";
import { codRemittancesQueryKey } from "../constants/codQueryKeys";

export const useInfiniteCodRemittances = (partnerId: string | null) =>
  useInfiniteCursorPage(
    codRemittancesQueryKey(partnerId),
    (cursor) => codApi.listRemittances(partnerId ?? "", cursor),
    partnerId !== null,
  );
