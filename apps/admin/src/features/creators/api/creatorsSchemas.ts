import type { CreatorStatus } from "@outfiqe/types";
import { z } from "zod";

const statusValues = ["NONE", "PENDING", "APPROVED", "REJECTED"] satisfies CreatorStatus[];
export const creatorStatusSchema = z.enum(statusValues);
export type CreatorStatusValue = z.infer<typeof creatorStatusSchema>;

export const creatorProfileSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  isCreator: z.boolean(),
  creatorStatus: creatorStatusSchema,
});
export type CreatorProfile = z.infer<typeof creatorProfileSchema>;
