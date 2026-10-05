"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { outfitApi, type PublishLookInput } from "../api/outfitApi";
import { myBuildLookQueryKey } from "./outfitQueryKeys";

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myBuildLookQueryKey(outfitId) }),
  });
};
