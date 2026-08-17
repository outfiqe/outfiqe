"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { creatorLooksApi } from "../api/creatorLooksApi";
import type { CreatorLook } from "../api/creatorLooksSchemas";
import type { LookFormInput } from "../schemas/lookForm.schema";

type UpdateLookVariables = { lookId: string; input: LookFormInput };

export const useUpdateLook = () => {
  const queryClient = useQueryClient();

  return useMutation<CreatorLook, ApiClientError, UpdateLookVariables>({
    mutationFn: ({ lookId, input }) => creatorLooksApi.update(lookId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-looks"] });
      queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });
};
