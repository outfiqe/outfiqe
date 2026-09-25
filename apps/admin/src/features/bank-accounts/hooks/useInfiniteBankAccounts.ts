import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { bankAccountsAdminApi } from "../api";
import type { OwnerTypeValue, VerifiedFilterValue } from "../schemas";

export const useInfiniteBankAccounts = (
  ownerType: OwnerTypeValue,
  verifiedFilter: VerifiedFilterValue,
) =>
  useInfiniteCursorPage(["bank-accounts-admin", ownerType, verifiedFilter], (cursor) =>
    bankAccountsAdminApi.list(ownerType, verifiedFilter, cursor),
  );
