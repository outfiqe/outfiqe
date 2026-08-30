import type { CrmPlanDefinition, CrmPlanId } from "./crm-billing.types.js";

export const CRM_PLAN_IDS = ["starter", "growth"] as const;

export const CRM_PLAN_ID = {
  STARTER: "starter",
  GROWTH: "growth",
} as const;

export const TRIAL_LENGTH_DAYS = 14;

export const BILLING_PERIOD_MONTHS = 1;

export const RENEWAL_LOOKAHEAD_DAYS = 3;

export const PAST_DUE_GRACE_DAYS = 7;

export const RENEWAL_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const INVOICE_RECONCILE_INTERVAL_MS = 5 * 60 * 1000;

export const INVOICE_RECONCILE_AFTER_MS = 5 * 60 * 1000;

export const INVOICE_EXPIRE_AFTER_MS = 60 * 60 * 1000;

export const DEFAULT_INVOICE_PAGE_SIZE = 20;

export const MAX_INVOICE_PAGE_SIZE = 50;

export const CRM_BILLING_CHECKOUT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export const CRM_BILLING_CHECKOUT_RATE_LIMIT_MAX_REQUESTS = 20;

export const CRM_PLAN_CATALOG: Record<CrmPlanId, CrmPlanDefinition> = {
  [CRM_PLAN_ID.STARTER]: {
    id: CRM_PLAN_ID.STARTER,
    name: "Starter",
    pricePerSeatPerMonth: 900,
    minSeats: 1,
    maxSeats: 10,
    unlocksAdvancedFeatures: true,
  },
  [CRM_PLAN_ID.GROWTH]: {
    id: CRM_PLAN_ID.GROWTH,
    name: "Growth",
    pricePerSeatPerMonth: 700,
    minSeats: 5,
    maxSeats: 100,
    unlocksAdvancedFeatures: true,
  },
};
