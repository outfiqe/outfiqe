import { useQuery } from "@tanstack/react-query";

import { ridersApi } from "../api/ridersApi";
import { RIDER_INVITES_QUERY_KEY } from "../constants/riderQueryKeys";

export const useRiderInvites = () =>
  useQuery({ queryKey: RIDER_INVITES_QUERY_KEY, queryFn: ridersApi.listInvites });
