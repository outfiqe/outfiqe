import { useQuery } from "@tanstack/react-query";

import { supportApi } from "../api/supportApi";

export const useSupportAgents = () =>
  useQuery({ queryKey: ["support-agents"], queryFn: () => supportApi.agents() });
