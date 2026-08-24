import { z } from "zod";

const RATE_PERCENT_MAX = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const createPlatformCommissionRuleSchema = z.object({
  ratePercent: z.number().nonnegative().max(RATE_PERCENT_MAX),
});
export type CreatePlatformCommissionRuleBody = z.infer<typeof createPlatformCommissionRuleSchema>;

export const listBrandPayoutsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListBrandPayoutsQuery = z.infer<typeof listBrandPayoutsQuerySchema>;
