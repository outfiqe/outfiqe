import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

const KHALTI_PAYMENTS_FLAG = "khalti_payments";
const myFeatureFlagsSchema = z.object({ enabledKeys: z.array(z.string()) });

export const useIsKhaltiOn = (): boolean => {
  const { data: enabledKeys } = useQuery({
    queryKey: ["feature-flags", "mine"],
    queryFn: async () => {
      const res = await apiClient.get("/feature-flags/mine");
      return myFeatureFlagsSchema.parse(res.data).enabledKeys;
    },
  });
  return enabledKeys?.includes(KHALTI_PAYMENTS_FLAG) ?? false;
};
