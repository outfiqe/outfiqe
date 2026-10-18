import { z } from "zod";

import { RefundDestinationKind } from "#generated/prisma/enums.js";
import { phoneSchema } from "#lib/phone.utils.js";

const ACCOUNT_NAME_MIN = 2;
const ACCOUNT_NAME_MAX = 120;
const ACCOUNT_NUMBER_PATTERN = /^\d{6,20}$/;

const accountNameSchema = z
  .string()
  .trim()
  .min(ACCOUNT_NAME_MIN, "Enter the account holder's name.")
  .max(ACCOUNT_NAME_MAX);

const confirmsOwnershipSchema = z.literal(true, {
  error: "Confirm that this account is yours.",
});

const walletDestinationSchema = z.object({
  kind: z.enum([RefundDestinationKind.KHALTI, RefundDestinationKind.ESEWA]),
  walletId: phoneSchema,
  accountName: accountNameSchema,
  confirmsOwnership: confirmsOwnershipSchema,
});

const bankDestinationSchema = z.object({
  kind: z.literal(RefundDestinationKind.BANK),
  bankId: z.uuid(),
  accountNumber: z
    .string()
    .trim()
    .regex(ACCOUNT_NUMBER_PATTERN, "Account number must be 6 to 20 digits."),
  accountName: accountNameSchema,
  confirmsOwnership: confirmsOwnershipSchema,
});

export const refundDestinationBodySchema = z.discriminatedUnion("kind", [
  walletDestinationSchema,
  bankDestinationSchema,
]);

export type RefundDestinationBody = z.infer<typeof refundDestinationBodySchema>;
