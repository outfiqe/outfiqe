import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { partnersApi } from "../api/partnersApi";
import type { WebhookReplay } from "../api/partnersSchemas";
import { partnerWebhookReceiptsQueryKey } from "../constants/partnerQueryKeys";

export const useReplayPartnerWebhookReceipts = (partnerId: string) =>
  useApiMutation<WebhookReplay, ApiClientError, string>({
    successMessage: "Updates sent again. They'll show as applied in a moment.",
    mutationFn: (since) => partnersApi.replayWebhookReceipts(partnerId, since),
    invalidateKeys: [partnerWebhookReceiptsQueryKey(partnerId)],
  });
