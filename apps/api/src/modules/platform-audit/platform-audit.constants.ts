export const DEFAULT_PLATFORM_AUDIT_PAGE_SIZE = 25;

export const MAX_PLATFORM_AUDIT_PAGE_SIZE = 100;

export const PLATFORM_AUDIT_ACTION = {
  IMPERSONATION_START: "impersonation.start",
  IMPERSONATION_END: "impersonation.end",
  FEATURE_OVERRIDE_SET: "feature.override.set",
  FEATURE_OVERRIDE_CLEARED: "feature.override.cleared",
  TENANT_REQUEST: "tenant.request",
} as const;
