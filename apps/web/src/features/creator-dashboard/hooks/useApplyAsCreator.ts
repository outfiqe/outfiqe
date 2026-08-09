"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { creatorDashboardApi } from "../api/creatorDashboardApi";

export const useApplyAsCreator = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: creatorDashboardApi.apply,
    onSuccess: () => {
      router.refresh();
    },
  });
};
