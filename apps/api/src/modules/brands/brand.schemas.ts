import { z } from "zod";

import { phoneSchema } from "#lib/phone.utils.js";

const CONTACT_NAME_MIN = 2;
const CONTACT_NAME_MAX = 100;
const INSTAGRAM_MIN = 1;
const INSTAGRAM_MAX = 100;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const SEARCH_QUERY_MAX_LENGTH = 100;

export const brandIdParamSchema = z.object({ id: z.uuid() });

export const listBrandsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH).optional(),
});

export const updateBrandProfileSchema = z
  .object({
    contactName: z.string().trim().min(CONTACT_NAME_MIN).max(CONTACT_NAME_MAX),
    phone: phoneSchema,
    instagram: z.string().trim().min(INSTAGRAM_MIN).max(INSTAGRAM_MAX),
    avatarUrl: z.url().nullable(),
    bannerUrl: z.url().nullable(),
  })
  .partial();

export type BrandIdParam = z.infer<typeof brandIdParamSchema>;
export type UpdateBrandProfileBody = z.infer<typeof updateBrandProfileSchema>;
export type ListBrandsQuery = z.infer<typeof listBrandsQuerySchema>;
