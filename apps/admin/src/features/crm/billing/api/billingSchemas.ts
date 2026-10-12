import { z } from "zod";

export const CRM_BILLING_PROVIDER = {
  ESEWA: "ESEWA",
  KHALTI: "KHALTI",
} as const;
export type CrmBillingProviderValue =
  (typeof CRM_BILLING_PROVIDER)[keyof typeof CRM_BILLING_PROVIDER];

export const subscriptionStatusSchema = z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"]);
export type SubscriptionStatusValue = z.infer<typeof subscriptionStatusSchema>;

export const invoiceStatusSchema = z.enum(["OPEN", "PAID", "VOID"]);
export type InvoiceStatusValue = z.infer<typeof invoiceStatusSchema>;

export const planDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricePerSeatPerMonth: z.number(),
  minSeats: z.number(),
  maxSeats: z.number(),
  unlocksAdvancedFeatures: z.boolean(),
});
export type PlanDefinition = z.infer<typeof planDefinitionSchema>;

export const subscriptionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  plan: z.string(),
  status: subscriptionStatusSchema,
  seats: z.number(),
  currentPeriodEnd: z.string(),
  cancelAtPeriodEnd: z.boolean(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const billingOverviewSchema = z.object({
  subscription: subscriptionSchema.nullable(),
  advancedFeaturesEnabled: z.boolean(),
  planCatalog: z.array(planDefinitionSchema),
  activeSeatCount: z.number(),
});
export type BillingOverview = z.infer<typeof billingOverviewSchema>;

export const subscriptionInvoiceSchema = z.object({
  id: z.string(),
  plan: z.string(),
  seats: z.number(),
  amount: z.number(),
  status: invoiceStatusSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  provider: z.enum(["ESEWA", "KHALTI"]).nullable(),
  initiatedAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  voidedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type SubscriptionInvoice = z.infer<typeof subscriptionInvoiceSchema>;

export const invoicePageSchema = z.object({
  invoices: z.array(subscriptionInvoiceSchema),
  nextCursor: z.string().nullable(),
});
export type InvoicePage = z.infer<typeof invoicePageSchema>;

export const checkoutRedirectSchema = z.union([
  z.object({
    mode: z.literal("FORM_POST"),
    formUrl: z.string(),
    fields: z.record(z.string(), z.string()),
    invoiceId: z.string(),
  }),
  z.object({
    mode: z.literal("REDIRECT"),
    redirectUrl: z.string(),
    invoiceId: z.string(),
  }),
]);
export type CheckoutRedirect = z.infer<typeof checkoutRedirectSchema>;

export const invoiceVerifyResultSchema = z.object({
  status: z.enum(["COMPLETE", "PENDING", "FAILED"]),
});
export type InvoiceVerifyResult = z.infer<typeof invoiceVerifyResultSchema>;
