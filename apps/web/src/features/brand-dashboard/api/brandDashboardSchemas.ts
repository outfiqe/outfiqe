import { z } from "zod";

export const brandProfileSchema = z.object({
  brand: z.object({
    id: z.string(),
    name: z.string(),
    contactName: z.string(),
    email: z.email(),
    phone: z.string(),
    instagram: z.string(),
    avatarUrl: z.url().nullable(),
    bannerUrl: z.url().nullable(),
    madeInNepal: z.boolean(),
    createdAt: z.string(),
  }),
  membershipRole: z.enum(["OWNER", "STAFF"]),
});

export type BrandProfile = z.infer<typeof brandProfileSchema>;

export const updateBrandProfileInputSchema = z
  .object({
    contactName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(1),
    instagram: z.string().trim().min(1).max(100),
    avatarUrl: z.url().nullable(),
    bannerUrl: z.url().nullable(),
  })
  .partial();

export type UpdateBrandProfileInput = z.infer<typeof updateBrandProfileInputSchema>;
