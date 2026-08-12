import { z } from "zod";

const brandCategorySchema = z.enum(["STREETWEAR", "TRADITIONAL", "THRIFT", "KIDS", "FORMAL"]);

export const brandProfileSchema = z.object({
  brand: z.object({
    id: z.string(),
    name: z.string(),
    category: brandCategorySchema,
    contactName: z.string(),
    email: z.email(),
    phone: z.string(),
    instagram: z.string(),
    avatarUrl: z.url().nullable(),
    madeInNepal: z.boolean(),
    createdAt: z.string(),
  }),
  membershipRole: z.enum(["OWNER", "STAFF"]),
});

export type BrandProfile = z.infer<typeof brandProfileSchema>;
export type BrandCategory = z.infer<typeof brandCategorySchema>;

export const updateBrandProfileInputSchema = z
  .object({
    contactName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(1),
    instagram: z.string().trim().min(1).max(100),
    avatarUrl: z.url().nullable(),
  })
  .partial();

export type UpdateBrandProfileInput = z.infer<typeof updateBrandProfileInputSchema>;
