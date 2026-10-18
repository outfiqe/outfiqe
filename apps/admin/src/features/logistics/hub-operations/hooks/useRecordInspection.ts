import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { hubOperationsApi } from "../api/hubOperationsApi";
import type { InspectionLine } from "../api/hubOperationsSchemas";
import { ORDERS_TO_PACK_QUERY_KEY } from "../constants/hubOperationQueryKeys";

type RecordInspectionInput = { groupId: string; lines: InspectionLine[]; note?: string };

export const useRecordInspection = () =>
  useApiMutation<
    Awaited<ReturnType<typeof hubOperationsApi.recordInspection>>,
    ApiClientError,
    RecordInspectionInput
  >({
    mutationFn: ({ groupId, lines, note }) =>
      hubOperationsApi.recordInspection(groupId, lines, note),
    invalidateKeys: [ORDERS_TO_PACK_QUERY_KEY],
  });
