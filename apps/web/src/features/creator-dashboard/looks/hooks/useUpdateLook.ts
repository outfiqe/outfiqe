"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { creatorLooksApi } from "../api/creatorLooksApi";
import type { CreatorLook } from "../api/creatorLooksSchemas";
import type { LookFormInput } from "../schemas/lookForm.schema";

type UpdateLookVariables = { lookId: string; input: LookFormInput };

export const useUpdateLook = () =>
  useApiMutation<CreatorLook, ApiClientError, UpdateLookVariables>({
    mutationFn: ({ lookId, input }) => creatorLooksApi.update(lookId, input),
    invalidateKeys: [["creator-looks"], ["explore-feed"], ["saved-posts"]],
  });
