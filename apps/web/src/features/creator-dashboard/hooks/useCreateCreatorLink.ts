"use client";

import { useMutation } from "@tanstack/react-query";

import { creatorLinksApi } from "../api/creatorLinksApi";
import type { CreatorLink } from "../api/creatorLinksSchemas";

export const useCreateInternalLink = () => {
  return useMutation<CreatorLink, Error, string>({
    mutationFn: (productId) => creatorLinksApi.createInternal(productId),
  });
};

export const useGetOrCreateExternalLink = () => {
  return useMutation<CreatorLink, Error, string | undefined>({
    mutationFn: (productId) => creatorLinksApi.getOrCreateExternal(productId),
  });
};
