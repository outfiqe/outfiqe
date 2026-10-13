"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { outfitApi } from "../../api/outfitApi";
import { shareRecipientsQueryKey } from "../../hooks/outfitQueryKeys";

export const useShareRecipients = (outfitId: string) =>
  useInfiniteCursorPage([...shareRecipientsQueryKey(outfitId)], (cursor) =>
    outfitApi.listShareRecipients(outfitId, cursor),
  );
