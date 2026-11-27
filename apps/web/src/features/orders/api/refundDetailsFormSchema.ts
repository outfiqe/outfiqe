import { RefundDestinationKind } from "@outfiqe/types";
import { NEPAL_PHONE_REGEX, stripPhoneSeparators } from "@outfiqe/utils";
import { z } from "zod";

import type { SaveRefundDestinationBody } from "./refundSchemas";

const ACCOUNT_NAME_MIN = 2;
const ACCOUNT_NAME_MAX = 120;
const ACCOUNT_NUMBER_PATTERN = /^\d{6,20}$/;

export const NO_BANK_CHOSEN = "";

export const REFUND_FORM_ERROR_MESSAGES = {
  walletId: "Enter a valid mobile number",
  bankId: "Choose your bank",
  accountNumber: "Account number must be 6 to 20 digits",
  accountName: "Enter the account holder's name",
} as const;

export const REFUND_FORM_FIELD_NAMES = [
  "walletId",
  "bankId",
  "accountNumber",
  "accountName",
] as const;

export type RefundFormFieldName = (typeof REFUND_FORM_FIELD_NAMES)[number];

export const isRefundFormFieldName = (value: string): value is RefundFormFieldName =>
  REFUND_FORM_FIELD_NAMES.some((fieldName) => fieldName === value);

export const refundDetailsFormSchema = z
  .object({
    kind: z.enum(RefundDestinationKind),
    walletId: z.string(),
    bankId: z.string(),
    accountNumber: z.string(),
    accountName: z
      .string()
      .trim()
      .min(ACCOUNT_NAME_MIN, REFUND_FORM_ERROR_MESSAGES.accountName)
      .max(ACCOUNT_NAME_MAX),
    confirmsOwnership: z.boolean(),
  })
  .superRefine((values, context) => {
    const reportInvalid = (fieldName: RefundFormFieldName) =>
      context.addIssue({
        code: "custom",
        path: [fieldName],
        message: REFUND_FORM_ERROR_MESSAGES[fieldName],
      });

    if (values.kind === RefundDestinationKind.BANK) {
      if (values.bankId === NO_BANK_CHOSEN) reportInvalid("bankId");
      if (!ACCOUNT_NUMBER_PATTERN.test(values.accountNumber.trim())) reportInvalid("accountNumber");
      return;
    }
    if (!NEPAL_PHONE_REGEX.test(stripPhoneSeparators(values.walletId))) reportInvalid("walletId");
  });

export type RefundDetailsFormValues = z.infer<typeof refundDetailsFormSchema>;

export const toSaveRefundDestinationBody = ({
  kind,
  walletId,
  bankId,
  accountNumber,
  accountName,
}: RefundDetailsFormValues): SaveRefundDestinationBody =>
  kind === RefundDestinationKind.BANK
    ? {
        kind,
        bankId,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        confirmsOwnership: true,
      }
    : {
        kind,
        walletId: stripPhoneSeparators(walletId),
        accountName: accountName.trim(),
        confirmsOwnership: true,
      };
