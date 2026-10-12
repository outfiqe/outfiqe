"use client";

import { useQuery } from "@tanstack/react-query";

import { outfitApi } from "../../api/outfitApi";
import { replacementsQueryKey } from "../../hooks/outfitQueryKeys";

export type ReplacementTarget = { outfitId: string; slotKey: string; position: number };

export const useReplacementSuggestions = (target: ReplacementTarget | null) =>
  useQuery({
    queryKey: target
      ? replacementsQueryKey(target.outfitId, target.slotKey, target.position)
      : ["outfit", "replacements", "none"],
    queryFn: () =>
      target
        ? outfitApi.listReplacements(target.outfitId, target.slotKey, target.position)
        : Promise.resolve([]),
    enabled: target !== null,
  });
