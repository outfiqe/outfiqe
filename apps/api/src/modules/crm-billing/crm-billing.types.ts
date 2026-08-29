import type {
  CrmBillingProvider,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
} from "#generated/prisma/enums.js";

import type { CRM_PLAN_IDS } from "./crm-billing.constants.js";

export type CrmPlanId = (typeof CRM_PLAN_IDS)[number];

export type CrmPlanDefinition = {
  id: CrmPlanId;
  name: string;
  pricePerSeatPerMonth: number;
  minSeats: number;
  maxSeats: number;
  unlocksAdvancedFeatures: boolean;
};

export type SubscriptionRecord = {
  id: string;
  organizationId: string;
  plan: string;
  status: SubscriptionStatus;
  seats: number;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SubscriptionInvoiceRecord = {
  id: string;
  subscriptionId: string;
  plan: string;
  seats: number;
  amount: number;
  status: SubscriptionInvoiceStatus;
  periodStart: Date;
  periodEnd: Date;
  provider: CrmBillingProvider | null;
  providerRef: string | null;
  initiatedAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  createdAt: Date;
};

export type AdvancedFeatureGateInput = {
  isPlatformOrg: boolean;
  trialEndsAt: Date | null;
};

export type BillingCheckoutInput = {
  organizationId: string;
  planId: CrmPlanId;
  seats: number;
  provider: CrmBillingProvider;
};

export type BillingCheckoutRedirect =
  | { mode: "FORM_POST"; formUrl: string; fields: Record<string, string>; invoiceId: string }
  | { mode: "REDIRECT"; redirectUrl: string; invoiceId: string };

export type BillingOverview = {
  subscription: SubscriptionRecord | null;
  advancedFeaturesEnabled: boolean;
  planCatalog: CrmPlanDefinition[];
  activeSeatCount: number;
};

export type InvoicePage = {
  invoices: SubscriptionInvoiceRecord[];
  nextCursor: string | null;
};

export type CreateInvoiceInput = {
  subscriptionId: string;
  plan: string;
  seats: number;
  amount: number;
  periodStart: Date;
  periodEnd: Date;
};

export type RenewalOrganization = {
  id: string;
  name: string;
  subdomain: string;
  isPlatformOrg: boolean;
};
