import { NEPAL_PHONE_REGEX, normalizeNepalPhone } from "@outfiqe/utils";

import type { Prisma } from "#generated/prisma/client.js";
import { isUuid, toUuidPrefixRange } from "#lib/uuid.utils.js";

const ORDER_REFERENCE_MARKER = "#";
const EMAIL_MARKER = "@";

export const MATCHES_NO_ORDER = { OR: [] } satisfies Prisma.OrderWhereInput;

export const buildAdminOrderSearchFilter = (search: string): Prisma.OrderWhereInput => {
  const searchTerm = search.trim().replace(ORDER_REFERENCE_MARKER, "").trim();

  if (isUuid(searchTerm)) return { id: searchTerm.toLowerCase() };

  if (searchTerm.includes(EMAIL_MARKER)) {
    return { user: { email: { in: [searchTerm, searchTerm.toLowerCase()] } } };
  }

  const nepalPhone = normalizeNepalPhone(searchTerm);
  if (NEPAL_PHONE_REGEX.test(nepalPhone)) return { user: { phone: nepalPhone } };

  const orderIdRange = toUuidPrefixRange(searchTerm);
  return orderIdRange ? { id: orderIdRange } : MATCHES_NO_ORDER;
};
