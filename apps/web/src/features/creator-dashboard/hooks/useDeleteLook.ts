"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { creatorLooksApi } from "../api/creatorLooksApi";

export const useDeleteLook = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, string>({
    mutationFn: (lookId) => creatorLooksApi.remove(lookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-looks"] });
      queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });
};
