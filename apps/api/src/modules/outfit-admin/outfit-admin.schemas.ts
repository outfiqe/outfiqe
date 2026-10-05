import { z } from "zod";

import { OutfitStatus, OutfitVisibility } from "#generated/prisma/enums.js";

import { OUTFIT_ADMIN_LIMITS } from "./outfit-admin.constants.js";

const {
  LIST_DEFAULT_PAGE_SIZE,
  LIST_MAX_PAGE_SIZE,
  SEARCH_MAX_LENGTH,
  REASON_MIN_LENGTH,
  REASON_MAX_LENGTH,
  METRICS_DEFAULT_WEEKS,
  METRICS_MAX_WEEKS,
} = OUTFIT_ADMIN_LIMITS;

const MIN_PAGE_SIZE = 1;
const MIN_WEEKS = 1;
const MIN_VERSION = 0;

export const listAdminBuildsQuerySchema = z.object({
  search: z.string().trim().min(1).max(SEARCH_MAX_LENGTH).optional(),
  status: z.enum(OutfitStatus).optional(),
  visibility: z.enum(OutfitVisibility).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(MIN_PAGE_SIZE)
    .max(LIST_MAX_PAGE_SIZE)
    .default(LIST_DEFAULT_PAGE_SIZE),
});

export const adminBuildIdParamSchema = z.object({ id: z.uuid() });

export const adminBuildHistoryQuerySchema = z.object({
  beforeVersion: z.coerce.number().int().min(MIN_VERSION).optional(),
});

export const adminBuildActionSchema = z.object({
  reason: z.string().trim().min(REASON_MIN_LENGTH).max(REASON_MAX_LENGTH),
});

export const buildMetricsQuerySchema = z.object({
  weeks: z.coerce
    .number()
    .int()
    .min(MIN_WEEKS)
    .max(METRICS_MAX_WEEKS)
    .default(METRICS_DEFAULT_WEEKS),
});

export type ListAdminBuildsQuery = z.infer<typeof listAdminBuildsQuerySchema>;
export type AdminBuildIdParam = z.infer<typeof adminBuildIdParamSchema>;
export type AdminBuildHistoryQuery = z.infer<typeof adminBuildHistoryQuerySchema>;
export type AdminBuildActionBody = z.infer<typeof adminBuildActionSchema>;
export type BuildMetricsQuery = z.infer<typeof buildMetricsQuerySchema>;
