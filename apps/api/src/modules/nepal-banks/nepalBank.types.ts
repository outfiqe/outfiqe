import type { BankType } from "#generated/prisma/enums.js";

export type NepalBankRecord = {
  id: string;
  name: string;
  code: string;
  type: BankType;
  logoUrl: string | null;
  isActive: boolean;
};

export type PublicNepalBank = {
  id: string;
  name: string;
  code: string;
  type: BankType;
  logoUrl: string | null;
};
