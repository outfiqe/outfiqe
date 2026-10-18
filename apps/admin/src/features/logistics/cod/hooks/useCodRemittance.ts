import { useQuery } from "@tanstack/react-query";

import { codApi } from "../api/codApi";
import { codRemittanceDetailQueryKey } from "../constants/codQueryKeys";

export const useCodRemittance = (remittanceId: string) =>
  useQuery({
    queryKey: codRemittanceDetailQueryKey(remittanceId),
    queryFn: () => codApi.getRemittance(remittanceId),
  });
