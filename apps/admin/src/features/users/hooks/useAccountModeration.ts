import { useApiMutation } from "@outfiqe/hooks";
import { useState } from "react";

import { ApiClientError } from "@/lib/apiClient";

import { usersApi } from "../api/usersApi";

const USERS_QUERY_KEY = ["users"];

const actionFailureMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiClientError ? error.message : fallback;

export const useAccountModeration = () => {
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);

  const suspend = useApiMutation({
    successMessage: "Account suspended.",
    mutationFn: ({
      userId,
      reason,
      durationHours,
    }: {
      userId: string;
      reason: string;
      durationHours?: number;
    }) => usersApi.suspend(userId, reason, durationHours),
    invalidateKeys: [USERS_QUERY_KEY],
    onSuccess: () => setSuspendTargetId(null),
  });

  const ban = useApiMutation({
    successMessage: "Account banned.",
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      usersApi.ban(userId, reason),
    invalidateKeys: [USERS_QUERY_KEY],
    onSuccess: () => setBanTargetId(null),
  });

  const unsuspend = useApiMutation({
    successMessage: "Account unsuspended.",
    mutationFn: (userId: string) => usersApi.unsuspend(userId),
    invalidateKeys: [USERS_QUERY_KEY],
  });

  const unban = useApiMutation({
    successMessage: "Account unbanned.",
    mutationFn: (userId: string) => usersApi.unban(userId),
    invalidateKeys: [USERS_QUERY_KEY],
  });

  const actionErrorFor = (userId: string): string | null => {
    if (suspend.isError && suspend.variables?.userId === userId) {
      return actionFailureMessage(suspend.error, "Couldn't suspend this account. Try again.");
    }
    if (ban.isError && ban.variables?.userId === userId) {
      return actionFailureMessage(ban.error, "Couldn't ban this account. Try again.");
    }
    if (unsuspend.isError && unsuspend.variables === userId) {
      return actionFailureMessage(unsuspend.error, "Couldn't unsuspend this account. Try again.");
    }
    if (unban.isError && unban.variables === userId) {
      return actionFailureMessage(unban.error, "Couldn't lift this ban. Try again.");
    }
    return null;
  };

  const anyActionPending =
    suspend.isPending || ban.isPending || unsuspend.isPending || unban.isPending;

  return {
    suspendTargetId,
    setSuspendTargetId,
    banTargetId,
    setBanTargetId,
    suspend,
    ban,
    unsuspend,
    unban,
    actionErrorFor,
    anyActionPending,
  };
};
