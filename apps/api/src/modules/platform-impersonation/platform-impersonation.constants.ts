export const IMPERSONATION_DEFAULT_TTL_MINUTES = 30;

export const IMPERSONATION_MAX_TTL_MINUTES = 60;

export const IMPERSONATION_SCOPES = ["read", "write"] as const;

export type ImpersonationScope = (typeof IMPERSONATION_SCOPES)[number];

export const IMPERSONATION_ACTOR_VIA = "impersonation";

export const IMPERSONATION_REAP_INTERVAL_MS = 60 * 60 * 1000;
