import { useQuery } from "@tanstack/react-query";

import { parcelsApi } from "../api/parcelsApi";
import { parcelLabelQueryKey } from "../constants/parcelQueryKeys";

export const useParcelLabel = (shipmentId: string) =>
  useQuery({
    queryKey: parcelLabelQueryKey(shipmentId),
    queryFn: () => parcelsApi.getLabel(shipmentId),
  });
