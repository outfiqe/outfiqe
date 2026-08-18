"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { exploreSearchApi } from "../api/exploreSearchApi";

export const useCreatorSearch = (q: string, enabled: boolean) =>
  useInfiniteCursorPage(
    ["creator-search", q],
    (cursor) => exploreSearchApi.creators({ q, cursor }),
    enabled,
  );

export const useLookSearch = (q: string, enabled: boolean) =>
  useInfiniteCursorPage(
    ["look-search", q],
    (cursor) => exploreSearchApi.posts({ q, cursor }),
    enabled,
  );
