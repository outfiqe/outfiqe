"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { clearAllOfflineData } from "@/features/pwa/utils/clearOfflineData";
import { acquireSocketConnection, releaseSocketConnection } from "@/shared/lib/socketClient";

import { useAuth } from "../context/AuthContext";
import {
  ACCOUNT_SUSPENDED_SOCKET_EVENT,
  type AccountSuspendedSocketPayload,
} from "../socketEvents";
import { AuthActionType } from "../types";
import { buildAccountSuspendedPath } from "../utils/accountSuspended";

export const useAccountSuspensionSocket = (): void => {
  const { isAuthenticated, dispatch } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = acquireSocketConnection();

    const handleAccountSuspended = (payload: AccountSuspendedSocketPayload) => {
      dispatch({ type: AuthActionType.AUTH_LOGOUT });
      void clearAllOfflineData();
      router.push(buildAccountSuspendedPath(payload));
    };

    socket.on(ACCOUNT_SUSPENDED_SOCKET_EVENT, handleAccountSuspended);

    return () => {
      socket.off(ACCOUNT_SUSPENDED_SOCKET_EVENT, handleAccountSuspended);
      releaseSocketConnection();
    };
  }, [isAuthenticated, dispatch, router]);
};
