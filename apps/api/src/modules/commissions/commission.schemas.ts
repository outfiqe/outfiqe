import { z } from "zod";

import { CommissionStatus } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const listEarningsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type ListEarningsQuery = z.infer<typeof listEarningsQuerySchema>;

const commissionTierFields = {
  minPrice: z.number().int().nonnegative(),
  maxPrice: z.number().int().positive().optional(),
  amount: z.number().int().positive(),
  sortOrder: z.number().int().optional(),
};

export const createCommissionTierSchema = z
  .object(commissionTierFields)
  .refine((tier) => tier.maxPrice === undefined || tier.maxPrice > tier.minPrice, {
    message: "Max price must be greater than min price.",
    path: ["maxPrice"],
  });

export const updateCommissionTierSchema = z.object({
  minPrice: commissionTierFields.minPrice.optional(),
  maxPrice: commissionTierFields.maxPrice,
  amount: commissionTierFields.amount.optional(),
  sortOrder: commissionTierFields.sortOrder,
});

export const commissionTierIdParamSchema = z.object({ id: z.uuid() });

export type CreateCommissionTierBody = z.infer<typeof createCommissionTierSchema>;
export type UpdateCommissionTierBody = z.infer<typeof updateCommissionTierSchema>;
export type CommissionTierIdParam = z.infer<typeof commissionTierIdParamSchema>;

export const listAdminCommissionsQuerySchema = z.object({
  status: z.enum(CommissionStatus).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListAdminCommissionsQuery = z.infer<typeof listAdminCommissionsQuerySchema>;

export const commissionIdParamSchema = z.object({ id: z.uuid() });
export type CommissionIdParam = z.infer<typeof commissionIdParamSchema>;

export const voidCommissionSchema = z.object({ reason: z.string().trim().min(1).max(500) });
export type VoidCommissionBody = z.infer<typeof voidCommissionSchema>;
