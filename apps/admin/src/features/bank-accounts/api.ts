import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  adminBankAccountSchema,
  type OwnerTypeValue,
  type RevealedBankAccount,
  revealedBankAccountSchema,
  type VerifiedFilterValue,
} from "./schemas";

const BASE_PATH: Record<OwnerTypeValue, string> = {
  CREATOR: "/bank-accounts",
  BUSINESS: "/brand-bank-accounts",
};

const bankAccountPageSchema = z.object({
  items: z.array(adminBankAccountSchema),
  nextCursor: z.string().nullable(),
});
export type BankAccountPage = z.infer<typeof bankAccountPageSchema>;

export const bankAccountsAdminApi = {
  async list(
    ownerType: OwnerTypeValue,
    verifiedFilter: VerifiedFilterValue,
    cursor?: string,
  ): Promise<BankAccountPage> {
    const params = new URLSearchParams({ verified: String(verifiedFilter === "verified") });
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<BankAccountPage>(
      `${BASE_PATH[ownerType]}/admin?${params.toString()}`,
    );
    return bankAccountPageSchema.parse(res.data);
  },

  async verify(ownerType: OwnerTypeValue, id: string): Promise<void> {
    await apiClient.patch(`${BASE_PATH[ownerType]}/${id}/verify`);
  },

  async reveal(ownerType: OwnerTypeValue, id: string): Promise<RevealedBankAccount> {
    const res = await apiClient.get<RevealedBankAccount>(`${BASE_PATH[ownerType]}/${id}/reveal`);
    return revealedBankAccountSchema.parse(res.data);
  },
};
