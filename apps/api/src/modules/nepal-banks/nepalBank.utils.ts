import type { NepalBankRecord, PublicNepalBank } from "./nepalBank.types.js";

export const toPublicNepalBank = ({
  id,
  name,
  code,
  type,
  logoUrl,
}: NepalBankRecord): PublicNepalBank => ({ id, name, code, type, logoUrl });
