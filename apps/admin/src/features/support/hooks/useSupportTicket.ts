import { useQuery } from "@tanstack/react-query";

import { supportApi } from "../api/supportApi";
import { TICKET_KEY } from "../constants/supportQueryKeys";

export const useSupportTicket = (id: string) =>
  useQuery({ queryKey: [TICKET_KEY, id], queryFn: () => supportApi.get(id) });
