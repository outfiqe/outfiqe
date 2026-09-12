import type { SuspendedAccountDetails } from "@/shared/lib/apiClient";

export const ACCOUNT_SUSPENDED_PATH = "/account-suspended";

export const isSuspendedAccountDetails = (value: unknown): value is SuspendedAccountDetails =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { reason?: unknown }).reason === "string";

export const buildAccountSuspendedPath = ({
  reason,
  expiresAt,
}: SuspendedAccountDetails): string => {
  const params = new URLSearchParams({ reason });
  if (expiresAt) params.set("expiresAt", expiresAt);
  return `${ACCOUNT_SUSPENDED_PATH}?${params.toString()}`;
};
