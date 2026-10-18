import { useQuery } from "@tanstack/react-query";

import { riderPayApi } from "../api/riderPayApi";
import { riderPayRatesQueryKey } from "../constants/riderPayQueryKeys";

export const useRiderPayRates = (countryCode: string) =>
  useQuery({
    queryKey: riderPayRatesQueryKey(countryCode),
    queryFn: () => riderPayApi.getRates(countryCode),
  });
