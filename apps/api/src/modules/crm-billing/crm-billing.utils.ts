import { isFuture } from "date-fns/isFuture";

import { SubscriptionStatus } from "#generated/prisma/enums.js";

import { CRM_PLAN_CATALOG } from "./crm-billing.constants.js";
import type {
  AdvancedFeatureGateInput,
  CrmPlanDefinition,
  CrmPlanId,
  SubscriptionInvoiceRecord,
  SubscriptionRecord,
} from "./crm-billing.types.js";

const ADVANCED_ACCESS_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
]);

export const getPlanDefinition = (planId: string): CrmPlanDefinition | null =>
  planId in CRM_PLAN_CATALOG ? CRM_PLAN_CATALOG[planId as CrmPlanId] : null;

export const clampSeatsToPlan = (planId: CrmPlanId, requestedSeats: number): number => {
  const plan = CRM_PLAN_CATALOG[planId];
  return Math.min(Math.max(requestedSeats, plan.minSeats), plan.maxSeats);
};

export const calculateInvoiceAmount = (planId: CrmPlanId, seats: number): number =>
  CRM_PLAN_CATALOG[planId].pricePerSeatPerMonth * seats;

export const isAdvancedCrmEnabled = (
  organization: AdvancedFeatureGateInput,
  subscription: Pick<SubscriptionRecord, "status" | "currentPeriodEnd"> | null,
): boolean => {
  if (organization.isPlatformOrg) return true;

  if (subscription && ADVANCED_ACCESS_STATUSES.has(subscription.status)) {
    if (subscription.status === SubscriptionStatus.ACTIVE) return true;
    return isFuture(subscription.currentPeriodEnd);
  }

  if (!subscription && organization.trialEndsAt) return isFuture(organization.trialEndsAt);

  return false;
};

export const toSubscriptionInvoiceRecord = (invoice: {
  id: string;
  subscriptionId: string;
  plan: string;
  seats: number;
  amount: number;
  status: SubscriptionInvoiceRecord["status"];
  periodStart: Date;
  periodEnd: Date;
  provider: SubscriptionInvoiceRecord["provider"];
  providerRef: string | null;
  initiatedAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  createdAt: Date;
}): SubscriptionInvoiceRecord => ({
  id: invoice.id,
  subscriptionId: invoice.subscriptionId,
  plan: invoice.plan,
  seats: invoice.seats,
  amount: invoice.amount,
  status: invoice.status,
  periodStart: invoice.periodStart,
  periodEnd: invoice.periodEnd,
  provider: invoice.provider,
  providerRef: invoice.providerRef,
  initiatedAt: invoice.initiatedAt,
  paidAt: invoice.paidAt,
  voidedAt: invoice.voidedAt,
  createdAt: invoice.createdAt,
});
