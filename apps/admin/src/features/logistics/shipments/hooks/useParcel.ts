import { useQuery } from "@tanstack/react-query";

import { parcelsApi } from "../api/parcelsApi";
import { parcelDetailQueryKey } from "../constants/parcelQueryKeys";

export const useParcel = (shipmentId: string) =>
  useQuery({
    queryKey: parcelDetailQueryKey(shipmentId),
    queryFn: () => parcelsApi.getParcel(shipmentId),
  });
