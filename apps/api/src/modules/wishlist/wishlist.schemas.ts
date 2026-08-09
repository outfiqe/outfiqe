import { z } from "zod";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export const wishlistProductIdParamSchema = z.object({
  productId: z.uuid(),
});

export const listWishlistQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type WishlistProductIdParam = z.infer<typeof wishlistProductIdParamSchema>;
export type ListWishlistQuery = z.infer<typeof listWishlistQuerySchema>;
