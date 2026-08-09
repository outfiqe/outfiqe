import { z } from "zod";

const CAPTION_MAX = 280;
const MIN_TAGGED_PRODUCTS = 1;
const MAX_TAGGED_PRODUCTS = 6;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export const createCreatorLookSchema = z.object({
  imageUrl: z.url(),
  caption: z.string().max(CAPTION_MAX).optional(),
  productIds: z.array(z.uuid()).min(MIN_TAGGED_PRODUCTS).max(MAX_TAGGED_PRODUCTS),
});

export const listCreatorLooksQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type CreateCreatorLookBody = z.infer<typeof createCreatorLookSchema>;
export type ListCreatorLooksQuery = z.infer<typeof listCreatorLooksQuerySchema>;
