import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { cancellationRequestsApi } from "../api/cancellationRequestsApi";
import { CANCELLATION_REQUESTS_QUERY_KEY } from "../constants/cancellationRequestLabels";

export const useInfiniteCancellationRequests = () =>
  useInfiniteCursorPage([...CANCELLATION_REQUESTS_QUERY_KEY], (cursor) =>
    cancellationRequestsApi.list(cursor),
  );
