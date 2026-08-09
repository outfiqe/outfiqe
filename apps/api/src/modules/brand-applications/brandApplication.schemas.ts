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
  category: brandCategorySchema,
  makesOwnPieces: makesOwnPiecesSchema,
});

export const brandApplicationStatusSchema = z.enum(BrandApplicationStatus);

export const listBrandApplicationsQuerySchema = z.object({
  status: brandApplicationStatusSchema.optional(),
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
