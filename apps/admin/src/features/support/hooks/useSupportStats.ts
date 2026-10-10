import { useQuery } from "@tanstack/react-query";

import { supportApi } from "../api/supportApi";
import { STATS_KEY } from "../constants/supportQueryKeys";

export const useSupportStats = ({ isEnabled }: { isEnabled: boolean }) =>
  useQuery({ queryKey: STATS_KEY, queryFn: () => supportApi.stats(), enabled: isEnabled });
