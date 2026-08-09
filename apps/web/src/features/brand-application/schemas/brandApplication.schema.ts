import { z } from "zod";

import { NEPAL_PHONE_REGEX } from "@outfiqe/shared-utils";

export const brandCategorySchema = z.enum([
  "STREETWEAR",
  "TRADITIONAL",
  "THRIFT",
  "KIDS",
  "FORMAL",
]);

export type BrandCategory = z.infer<typeof brandCategorySchema>;

export const makesOwnPiecesSchema = z.enum(["MAKES", "RESELLS", "BOTH"]);
export type MakesOwnPieces = z.infer<typeof makesOwnPiecesSchema>;

export const brandApplicationSchema = z.object({
  brandName: z.string().trim().min(2, "Enter your brand name").max(100),
  contactName: z.string().trim().min(2, "Enter your name").max(100),
  email: z.email("Enter a valid email address").transform((v) => v.toLowerCase().trim()),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(
      z.string().regex(NEPAL_PHONE_REGEX, "Enter a valid Nepali phone number starting with 98"),
    ),
  instagram: z.string().trim().min(1, "Enter your Instagram or TikTok handle").max(100),
  category: brandCategorySchema,
  makesOwnPieces: makesOwnPiecesSchema,
});

export type BrandApplicationInput = z.infer<typeof brandApplicationSchema>;
