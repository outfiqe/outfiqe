"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { outfitApi } from "../api/outfitApi";
import { MY_BUILDS_QUERY_KEY, SHARED_BUILDS_QUERY_KEY } from "./outfitQueryKeys";

export const useMyBuilds = () =>
  useInfiniteCursorPage([...MY_BUILDS_QUERY_KEY], (cursor) => outfitApi.listMine(cursor));

export const useBuildsSharedWithMe = () =>
  useInfiniteCursorPage([...SHARED_BUILDS_QUERY_KEY], (cursor) =>
    outfitApi.listSharedWithMe(cursor),
  );
