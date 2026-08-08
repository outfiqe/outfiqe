"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useAuth } from "../context/AuthContext";

export function useLogout() {
  const { logout } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      router.replace("/login");
    },
  });
}
