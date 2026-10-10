"use client";

import { useQuery } from "@tanstack/react-query";

import { outfitApi } from "../../api/outfitApi";
import { outfitQueryKey } from "../../hooks/outfitQueryKeys";

export const useOutfit = (outfitId: string) =>
  useQuery({
    queryKey: outfitQueryKey(outfitId),
    queryFn: () => outfitApi.get(outfitId),
  });
