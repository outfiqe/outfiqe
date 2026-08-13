import { z } from "zod";

import { phoneSchema } from "#lib/phone.utils.js";

import {
  BrandApplicationStatus,
  BrandCategory,
  MakesOwnPieces,
} from "../../generated/prisma/enums.js";

export const brandCategorySchema = z.enum(BrandCategory);
export const makesOwnPiecesSchema = z.enum(MakesOwnPieces);

export const createBrandApplicationSchema = z.object({
  brandName: z.string().min(2).max(100),
  contactName: z.string().min(2).max(100),
  email: z.email(),
  phone: phoneSchema,
  instagram: z.string().min(1).max(100),
  categories: z.array(brandCategorySchema).default([]),
  makesOwnPieces: makesOwnPiecesSchema,
});

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export const brandApplicationStatusSchema = z.enum(BrandApplicationStatus);

export const listBrandApplicationsQuerySchema = z.object({
  status: brandApplicationStatusSchema.optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const brandApplicationIdParamSchema = z.object({
  id: z.uuid(),
});

export const rejectBrandApplicationSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

export type CreateBrandApplicationBody = z.infer<typeof createBrandApplicationSchema>;
export type ListBrandApplicationsQuery = z.infer<typeof listBrandApplicationsQuerySchema>;
export type BrandApplicationIdParam = z.infer<typeof brandApplicationIdParamSchema>;
export type RejectBrandApplicationBody = z.infer<typeof rejectBrandApplicationSchema>;
