"use client";

import { useQuery } from "@tanstack/react-query";

import { readSharedPhoto } from "../utils/shareTargetPhoto";

const SHARED_PHOTO_QUERY_KEY = ["pwa", "shared-photo"] as const;

export const useSharedPhoto = () =>
  useQuery({
    queryKey: SHARED_PHOTO_QUERY_KEY,
    queryFn: readSharedPhoto,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
