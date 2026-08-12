"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";
import { creatorProfileApi } from "../api/creatorProfileApi";

export const useInfiniteCreatorLooks = (handle: string) => {
  return useInfiniteCursorPage(["creator-looks", handle], (cursor) =>
    creatorProfileApi.listLooks(handle, cursor),
  );
};
