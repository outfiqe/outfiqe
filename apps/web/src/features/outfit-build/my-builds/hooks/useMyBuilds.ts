"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { outfitApi } from "../../api/outfitApi";
import { MY_BUILDS_QUERY_KEY, SHARED_BUILDS_QUERY_KEY } from "../../hooks/outfitQueryKeys";

export const useMyBuilds = (search?: string) =>
  useInfiniteCursorPage(
    search ? [...MY_BUILDS_QUERY_KEY, search] : [...MY_BUILDS_QUERY_KEY],
    (cursor) => outfitApi.listMine(cursor, search),
  );

export const useBuildsSharedWithMe = (search?: string) =>
  useInfiniteCursorPage(
    search ? [...SHARED_BUILDS_QUERY_KEY, search] : [...SHARED_BUILDS_QUERY_KEY],
    (cursor) => outfitApi.listSharedWithMe(cursor, search),
  );
