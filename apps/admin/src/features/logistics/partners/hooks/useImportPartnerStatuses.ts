import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { PARCELS_QUERY_KEY } from "../../shipments/constants/parcelQueryKeys";
import { partnersApi } from "../api/partnersApi";
import type { StatusImport } from "../api/partnersSchemas";

export const useImportPartnerStatuses = (partnerId: string) =>
  useApiMutation<StatusImport, ApiClientError, { fileName: string; csv: string }>({
    mutationFn: (body) => partnersApi.importStatuses(partnerId, body),
    invalidateKeys: [PARCELS_QUERY_KEY],
  });
