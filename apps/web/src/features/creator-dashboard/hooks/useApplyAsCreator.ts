"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";

import { creatorDashboardApi } from "../api/creatorDashboardApi";

export const useApplyAsCreator = () => {
  const router = useRouter();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: creatorDashboardApi.apply,
    onSuccess: (profile) => {
      updateUser({ creatorStatus: profile.creatorStatus });
      router.refresh();
    },
  });
};
