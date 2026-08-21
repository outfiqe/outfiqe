import { z } from "zod";

import { XpActivityType } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const REASON_MAX_LENGTH = 500;
const ICON_MAX_LENGTH = 8;

export const listXpTransactionsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type ListXpTransactionsQuery = z.infer<typeof listXpTransactionsQuerySchema>;

export const createLevelSchema = z.object({
  level: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  requiredXp: z.number().int().nonnegative(),
  icon: z.string().trim().min(1).max(ICON_MAX_LENGTH).optional(),
});

export const updateLevelSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  requiredXp: z.number().int().nonnegative().optional(),
  icon: z.string().trim().min(1).max(ICON_MAX_LENGTH).optional(),
  isActive: z.boolean().optional(),
});

export const levelIdParamSchema = z.object({ id: z.uuid() });

export type CreateLevelBody = z.infer<typeof createLevelSchema>;
export type UpdateLevelBody = z.infer<typeof updateLevelSchema>;
export type LevelIdParam = z.infer<typeof levelIdParamSchema>;

export const updateActivityXpConfigSchema = z.object({
  enabled: z.boolean().optional(),
  xpAmount: z.number().int().nonnegative().optional(),
  dailyLimit: z.number().int().positive().nullable().optional(),
  cooldownSeconds: z.number().int().positive().nullable().optional(),
  maxPerEntity: z.number().int().positive().nullable().optional(),
});

export const activityTypeParamSchema = z.object({
  activityType: z.enum(XpActivityType),
});

export type UpdateActivityXpConfigBody = z.infer<typeof updateActivityXpConfigSchema>;
export type ActivityTypeParam = z.infer<typeof activityTypeParamSchema>;

export const adjustXpSchema = z.object({
  userId: z.uuid(),
  amount: z
    .number()
    .int()
    .refine((amount) => amount !== 0, {
      message: "Amount must not be zero.",
    }),
  reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
});

export type AdjustXpBody = z.infer<typeof adjustXpSchema>;
