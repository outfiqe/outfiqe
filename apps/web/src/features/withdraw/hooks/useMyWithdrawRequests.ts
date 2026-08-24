"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { withdrawApi } from "../api/withdrawApi";
import type { OwnerTypeValue } from "../api/withdrawSchemas";

export const useMyWithdrawRequests = (ownerType: OwnerTypeValue) => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    ["withdraw", "requests", ownerType],
    (cursor) => withdrawApi.listMine(ownerType, cursor),
    isAuthenticated,
  );
};
