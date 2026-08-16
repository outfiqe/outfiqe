import { z } from "zod";

export const paymentInitiateResultSchema = z.union([
  z.object({
    mode: z.literal("FORM_POST"),
    formUrl: z.string(),
    fields: z.record(z.string(), z.string()),
  }),
  z.object({
    mode: z.literal("REDIRECT"),
    redirectUrl: z.string(),
  }),
]);
export type PaymentInitiateResult = z.infer<typeof paymentInitiateResultSchema>;

export const PaymentVerifyStatus = {
  COMPLETE: "COMPLETE",
  PENDING: "PENDING",
  FAILED: "FAILED",
} as const;
export type PaymentVerifyStatusValue =
  (typeof PaymentVerifyStatus)[keyof typeof PaymentVerifyStatus];

export const paymentVerifyResultSchema = z.object({
  status: z.enum(PaymentVerifyStatus),
});
export type PaymentVerifyResult = z.infer<typeof paymentVerifyResultSchema>;
