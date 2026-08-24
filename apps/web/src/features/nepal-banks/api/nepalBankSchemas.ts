import type { BankType as BankTypeType } from "@outfiqe/types";
import { z } from "zod";

export const BankType = {
  COMMERCIAL: "COMMERCIAL",
  DEVELOPMENT: "DEVELOPMENT",
  FINANCE: "FINANCE",
} as const satisfies Record<string, BankTypeType>;

export const nepalBankSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  type: z.enum(BankType),
  logoUrl: z.string().nullable(),
});
export type NepalBank = z.infer<typeof nepalBankSchema>;

export const nepalBankListSchema = z.array(nepalBankSchema);
