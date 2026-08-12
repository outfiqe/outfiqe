import { z } from "zod";

import { phoneSchema } from "#lib/phone.utils.js";

const CONTACT_NAME_MIN = 2;
const CONTACT_NAME_MAX = 100;
const INSTAGRAM_MIN = 1;
const INSTAGRAM_MAX = 100;

export const brandIdParamSchema = z.object({ id: z.uuid() });

export const updateBrandProfileSchema = z
  .object({
    contactName: z.string().trim().min(CONTACT_NAME_MIN).max(CONTACT_NAME_MAX),
    phone: phoneSchema,
    instagram: z.string().trim().min(INSTAGRAM_MIN).max(INSTAGRAM_MAX),
    avatarUrl: z.url().nullable(),
  })
  .partial();

export type BrandIdParam = z.infer<typeof brandIdParamSchema>;
export type UpdateBrandProfileBody = z.infer<typeof updateBrandProfileSchema>;
