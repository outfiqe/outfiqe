"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { xpApi } from "../api/xpApi";

export const useMyXpTransactions = () => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    ["xp", "mine", "transactions"],
    (cursor) => xpApi.listMyTransactions(cursor),
    isAuthenticated,
  );
};
