import { z } from "zod";

import { phoneSchema } from "#lib/phone.utils.js";

export const brandCategorySchema = z.enum([
  "STREETWEAR",
  "TRADITIONAL",
  "THRIFT",
  "KIDS",
  "FORMAL",
]);
export const makesOwnPiecesSchema = z.enum(["MAKES", "RESELLS", "BOTH"]);

export const createBrandApplicationSchema = z.object({
  brandName: z.string().min(2).max(100),
  contactName: z.string().min(2).max(100),
  email: z.email(),
  phone: phoneSchema,
  instagram: z.string().min(1).max(100),
  category: brandCategorySchema,
  makesOwnPieces: makesOwnPiecesSchema,
});

export type CreateBrandApplicationBody = z.infer<typeof createBrandApplicationSchema>;
