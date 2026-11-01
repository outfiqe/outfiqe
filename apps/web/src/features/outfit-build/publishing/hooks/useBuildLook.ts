"use client";

import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trackEvent } from "@/features/analytics/utils/analyticsClient";

import { outfitApi, type PublishLookInput } from "../../api/outfitApi";
import { myBuildLookQueryKey } from "../../hooks/outfitQueryKeys";

export const useMyBuildLook = (outfitId: string, isEnabled: boolean) =>
  useQuery({
    queryKey: myBuildLookQueryKey(outfitId),
    queryFn: () => outfitApi.getMyLook(outfitId),
    enabled: isEnabled,
  });

export const usePublishBuildLook = (outfitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishLookInput) => outfitApi.publishLook(outfitId, input),
    onSuccess: () => {
      trackEvent(ANALYTICS_EVENTS.OUTFIT_BUILD_PUBLISH, { build_id: outfitId });
      return queryClient.invalidateQueries({ queryKey: myBuildLookQueryKey(outfitId) });
    },
  });
};
