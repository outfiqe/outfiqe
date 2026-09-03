export const MIN_SEARCH_QUERY_LENGTH = 2;
export const MAX_SEARCH_QUERY_LENGTH = 100;
export const SEARCH_RESULTS_PER_TYPE = 5;

export const ACTIVITY_TREND_WINDOW_DAYS = 30;

export const CRM_SEARCH_ENTITY = {
  PARTNER: "partner",
  CUSTOMER: "customer",
  DEAL: "deal",
  TICKET: "ticket",
} as const;

export const CRM_SEARCH_ENTITY_PERMISSION: Record<
  (typeof CRM_SEARCH_ENTITY)[keyof typeof CRM_SEARCH_ENTITY],
  string
> = {
  [CRM_SEARCH_ENTITY.PARTNER]: "accounts:read",
  [CRM_SEARCH_ENTITY.CUSTOMER]: "customers:read",
  [CRM_SEARCH_ENTITY.DEAL]: "deals:read",
  [CRM_SEARCH_ENTITY.TICKET]: "tickets:read",
};

export const CRM_SEARCH_READ_PERMISSION_KEYS = Object.values(CRM_SEARCH_ENTITY_PERMISSION);

export const CRM_REPORTING_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const CRM_REPORTING_RATE_LIMIT_MAX_REQUESTS = 60;
