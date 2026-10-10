import type { BrandApplicationStatus, MakesOwnPieces } from "@outfiqe/types";
import { z } from "zod";

const statusValues = ["PENDING", "APPROVED", "REJECTED"] satisfies BrandApplicationStatus[];
export const brandApplicationStatusSchema = z.enum(statusValues);
export type BrandApplicationStatusValue = z.infer<typeof brandApplicationStatusSchema>;

const makesOwnPiecesValues = ["MAKES", "RESELLS", "BOTH"] satisfies MakesOwnPieces[];
export const makesOwnPiecesSchema = z.enum(makesOwnPiecesValues);

export const brandApplicationSchema = z.object({
  id: z.string(),
  brandName: z.string(),
  contactName: z.string(),
  email: z.string(),
  phone: z.string(),
  instagram: z.string(),
  makesOwnPieces: makesOwnPiecesSchema,
  status: brandApplicationStatusSchema,
  reviewedAt: z.string().nullable(),
  reviewedById: z.string().nullable(),
  createdAt: z.string(),
});
export type BrandApplication = z.infer<typeof brandApplicationSchema>;
