import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { codApi } from "../api/codApi";
import type { CodRemittanceDetail, RecordCodRemittanceBody } from "../api/codSchemas";
import { COD_QUERY_KEY } from "../constants/codQueryKeys";

export const useRecordCodRemittance = () =>
  useApiMutation<CodRemittanceDetail, ApiClientError, RecordCodRemittanceBody>({
    successMessage: "Payment recorded.",
    mutationFn: codApi.recordRemittance,
    invalidateKeys: [COD_QUERY_KEY],
  });
