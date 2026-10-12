import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { bankAccountsAdminApi } from "../api/bankAccountsApi";
import type { OwnerTypeValue, VerifiedFilterValue } from "../api/bankAccountsSchemas";

export const useInfiniteBankAccounts = (
  ownerType: OwnerTypeValue,
  verifiedFilter: VerifiedFilterValue,
) =>
  useInfiniteCursorPage(["bank-accounts-admin", ownerType, verifiedFilter], (cursor) =>
    bankAccountsAdminApi.list(ownerType, verifiedFilter, cursor),
  );
