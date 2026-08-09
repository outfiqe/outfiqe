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
    madeInNepal: z.boolean(),
    createdAt: z.string(),
  }),
  membershipRole: z.enum(["OWNER", "STAFF"]),
});

export type BrandProfile = z.infer<typeof brandProfileSchema>;
export type BrandCategory = z.infer<typeof brandCategorySchema>;
