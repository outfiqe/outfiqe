import { z } from "zod";

export const taggedProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
});

export const creatorLookSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  caption: z.string().nullable(),
  createdAt: z.string(),
  taggedProducts: z.array(taggedProductSchema),
});
export type CreatorLook = z.infer<typeof creatorLookSchema>;
