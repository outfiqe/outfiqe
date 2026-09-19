"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { creatorLooksApi } from "../api/creatorLooksApi";
import type { CreatorLook } from "../api/creatorLooksSchemas";
import type { LookFormInput } from "../schemas/lookForm.schema";

export const useCreateLook = () =>
  useApiMutation<CreatorLook, ApiClientError, LookFormInput>({
    mutationFn: creatorLooksApi.create,
    invalidateKeys: [["creator-looks"], ["explore-feed"], ["saved-posts"]],
  });
