"use client";

import { useInfiniteCursorPage } from "@outfiqe/shared-hooks";

import { creatorLooksApi } from "../api/creatorLooksApi";

export const useMyLooks = () => {
  return useInfiniteCursorPage(["creator-looks", "mine"], (cursor) =>
    creatorLooksApi.listMine(cursor),
  );
};
