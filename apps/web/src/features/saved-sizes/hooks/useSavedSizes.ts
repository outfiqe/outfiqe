"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useAuth } from "@/features/auth";

import { type SavedSize, savedSizesApi } from "../api/savedSizesApi";

export const SAVED_SIZES_QUERY_KEY = ["saved-sizes", "me"];

const SAVED_SIZES_STALE_TIME_MS = 5 * 60 * 1000;

export const useSavedSizes = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: SAVED_SIZES_QUERY_KEY,
    queryFn: savedSizesApi.listMine,
    enabled: isAuthenticated,
    staleTime: SAVED_SIZES_STALE_TIME_MS,
  });
};

export const useMySizeByProductType = (): Map<string, string> => {
  const { data: savedSizes = [] } = useSavedSizes();
  return new Map(
    savedSizes.flatMap(({ productTypeId, savedSize, lastBoughtSize }) => {
      const mySize = savedSize ?? lastBoughtSize;
      return mySize ? [[productTypeId, mySize] as const] : [];
    }),
  );
};

type SizeChange = { productTypeId: string; sizeLabel: string | null };

export const useChangeSavedSize = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("savedSizes");

  return useMutation({
    mutationFn: ({ productTypeId, sizeLabel }: SizeChange): Promise<SavedSize[]> =>
      sizeLabel === null
        ? savedSizesApi.clear(productTypeId)
        : savedSizesApi.save(productTypeId, sizeLabel),
    onSuccess: (savedSizes, { sizeLabel }) => {
      queryClient.setQueryData(SAVED_SIZES_QUERY_KEY, savedSizes);
      toast.success(sizeLabel === null ? t("cleared") : t("saved"));
    },
    onError: () => toast.error(t("saveFailed")),
  });
};
