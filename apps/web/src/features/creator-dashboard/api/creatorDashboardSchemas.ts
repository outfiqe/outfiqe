import { z } from "zod";

import { creatorStatusSchema } from "@/features/auth/types";

export const creatorProfileSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.email(),
  avatarUrl: z.url().nullable(),
  isCreator: z.boolean(),
  creatorStatus: creatorStatusSchema,
});

export type CreatorProfile = z.infer<typeof creatorProfileSchema>;

export const updateCreatorProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    avatarUrl: z.url().nullable(),
  })
  .partial();

export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileInputSchema>;
