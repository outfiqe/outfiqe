import { z } from "zod";

import { creatorStatusSchema } from "@/features/auth/types";

export const creatorProfileSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.email(),
  handle: z.string(),
  avatarUrl: z.url().nullable(),
  heightCm: z.number().nullable(),
  showHeight: z.boolean(),
  isCreator: z.boolean(),
  creatorStatus: creatorStatusSchema,
});

export type CreatorProfile = z.infer<typeof creatorProfileSchema>;

export const updateCreatorProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    avatarUrl: z.url().nullable(),
    heightCm: z.number().nullable(),
    showHeight: z.boolean(),
  })
  .partial();

export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileInputSchema>;
