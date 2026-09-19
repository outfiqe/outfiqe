"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { creatorLooksApi } from "../api/creatorLooksApi";

export const useDeleteLook = () =>
  useApiMutation<void, ApiClientError, string>({
    mutationFn: (lookId) => creatorLooksApi.remove(lookId),
    invalidateKeys: [["creator-looks"], ["explore-feed"], ["saved-posts"]],
  });
