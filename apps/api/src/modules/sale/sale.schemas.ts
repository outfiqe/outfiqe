import { z } from "zod";

const DEFAULT_TOP_LIMIT = 20;
const MAX_TOP_LIMIT = 50;

export const saleDebugParamSchema = z.object({ productId: z.uuid() });

export const listTopSaleQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_TOP_LIMIT).default(DEFAULT_TOP_LIMIT),
});

export type SaleDebugParam = z.infer<typeof saleDebugParamSchema>;
export type ListTopSaleQuery = z.infer<typeof listTopSaleQuerySchema>;
