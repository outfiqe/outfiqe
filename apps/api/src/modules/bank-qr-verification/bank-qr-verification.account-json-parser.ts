import { z } from "zod";

import type { BankAccountQrDetails } from "./bank-qr-verification.types.js";

const accountJsonQrSchema = z.object({
  accountName: z.string().trim().min(1),
  accountNumber: z.string().trim().min(1),
  bankCode: z.string().trim().min(1).optional(),
});

const parseJsonOrNull = (qrText: string): unknown => {
  try {
    return JSON.parse(qrText);
  } catch {
    return null;
  }
};

export const parseAccountJsonPayload = (qrText: string): BankAccountQrDetails | null => {
  const parsed = accountJsonQrSchema.safeParse(parseJsonOrNull(qrText.trim()));
  if (!parsed.success) return null;

  const { accountName, accountNumber, bankCode } = parsed.data;
  return { accountName, accountNumber, bankSwiftCode: bankCode ?? null };
};
