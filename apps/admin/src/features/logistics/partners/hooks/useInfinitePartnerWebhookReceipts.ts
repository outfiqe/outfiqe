import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { partnersApi } from "../api/partnersApi";
import { partnerWebhookReceiptsQueryKey } from "../constants/partnerQueryKeys";

export const useInfinitePartnerWebhookReceipts = (partnerId: string) =>
  useInfiniteCursorPage(partnerWebhookReceiptsQueryKey(partnerId), (cursor) =>
    partnersApi.listWebhookReceipts(partnerId, cursor),
  );
