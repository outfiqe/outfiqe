"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { creatorLooksApi } from "../api/creatorLooksApi";
import type { CreatorLook } from "../api/creatorLooksSchemas";
import type { LookFormInput } from "../schemas/lookForm.schema";

export const useCreateLook = () => {
  const queryClient = useQueryClient();

  return useMutation<CreatorLook, ApiClientError, LookFormInput>({
    mutationFn: creatorLooksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-looks", "mine"] });
    },
  });
};
