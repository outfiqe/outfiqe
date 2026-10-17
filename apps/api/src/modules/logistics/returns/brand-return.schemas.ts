import { z } from "zod";

import { BrandReturnStatus } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const listBrandReturnsQuerySchema = z.object({
  status: z.enum(BrandReturnStatus).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const brandReturnIdParamSchema = z.object({ brandReturnId: z.uuid() });

export type ListBrandReturnsQuery = z.infer<typeof listBrandReturnsQuerySchema>;
export type BrandReturnIdParam = z.infer<typeof brandReturnIdParamSchema>;
