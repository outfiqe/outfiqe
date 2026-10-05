"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { commissionApi } from "../api/commissionApi";

export const useMyEarnings = (canEarn = true) => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    ["commissions", "mine"],
    (cursor) => commissionApi.listMine(cursor),
    isAuthenticated && canEarn,
  );
};
