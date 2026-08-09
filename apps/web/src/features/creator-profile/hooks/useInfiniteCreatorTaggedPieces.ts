"use client";

import { useInfiniteCursorPage } from "@/shared/hooks/useInfiniteCursorPage";
import { creatorProfileApi } from "../api/creatorProfileApi";

export const useInfiniteCreatorTaggedPieces = (handle: string) => {
  return useInfiniteCursorPage(["creator-tagged-pieces", handle], (cursor) =>
    creatorProfileApi.listLooks(handle, cursor),
  );
};
