import { apiClient } from "@/shared/lib/apiClient";

import {
  type AddBankAccountInput,
  type BankAccount,
  bankAccountListSchema,
  type CreateBankAccountResult,
  createBankAccountResultSchema,
  OwnerType,
  type OwnerTypeValue,
} from "./bankAccountSchemas";

const BASE_PATH: Record<OwnerTypeValue, string> = {
  [OwnerType.CREATOR]: "/bank-accounts",
  [OwnerType.BUSINESS]: "/brand-bank-accounts",
};

export const bankAccountApi = {
  async list(ownerType: OwnerTypeValue): Promise<BankAccount[]> {
    const res = await apiClient.get<BankAccount[]>(BASE_PATH[ownerType]);
    return bankAccountListSchema.parse(res.data);
  },

  async create(
    ownerType: OwnerTypeValue,
    input: AddBankAccountInput,
  ): Promise<CreateBankAccountResult> {
    const res = await apiClient.post<CreateBankAccountResult>(BASE_PATH[ownerType], input);
    return createBankAccountResultSchema.parse(res.data);
  },

  async setDefault(ownerType: OwnerTypeValue, id: string): Promise<void> {
    await apiClient.patch(`${BASE_PATH[ownerType]}/${id}/default`);
  },
};
