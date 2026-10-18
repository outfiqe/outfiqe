"use client";

import { useState } from "react";

import { useLogout } from "@/features/auth";

import { useUnsentScanCount } from "../context/PendingScansContext";

const NO_UNSENT_SCANS = 0;

export const useSignOutWithScanCheck = () => {
  const unsentScanCount = useUnsentScanCount();
  const logout = useLogout();
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  const signOut = () => logout.mutate();

  const requestSignOut = () => {
    if (unsentScanCount > NO_UNSENT_SCANS) {
      setIsWarningOpen(true);
      return;
    }
    signOut();
  };

  return {
    requestSignOut,
    signOut,
    isSigningOut: logout.isPending,
    isWarningOpen,
    closeWarning: () => setIsWarningOpen(false),
    unsentScanCount,
  };
};
