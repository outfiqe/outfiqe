export const ACCOUNT_SUSPENDED_SOCKET_EVENT = "account:suspended";

export type AccountSuspendedSocketPayload = {
  reason: string;
  expiresAt: string | null;
};
