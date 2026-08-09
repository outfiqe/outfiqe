import { z } from "zod";

import { creatorStatusSchema } from "@/features/auth/types";

export const creatorProfileSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.email(),
  isCreator: z.boolean(),
  creatorStatus: creatorStatusSchema,
});

export type CreatorProfile = z.infer<typeof creatorProfileSchema>;
