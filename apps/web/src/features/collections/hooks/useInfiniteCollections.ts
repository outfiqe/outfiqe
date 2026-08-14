"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { collectionsApi } from "../api/collectionsApi";

export const useInfiniteCollections = () => {
  return useInfiniteCursorPage(["collections"], (cursor) => collectionsApi.list(cursor));
};
