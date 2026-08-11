"use client";

import { useInfiniteCursorPage } from "@outfiqe/shared-hooks";
import { collectionsApi } from "../api/collectionsApi";

export const useInfiniteCollections = () => {
  return useInfiniteCursorPage(["collections"], (cursor) => collectionsApi.list(cursor));
};
