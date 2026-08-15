"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";

export const EXPLORE_SIGN_IN_REDIRECT = "/login?redirect=/explore";

export const useExploreAuthGate = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const goToSignIn = () => router.push(EXPLORE_SIGN_IN_REDIRECT);
  const gated = (action: () => void) => (isAuthenticated ? action() : goToSignIn());

  return { isAuthenticated, goToSignIn, gated };
};
