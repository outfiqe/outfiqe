import { z } from "zod";

import { CreatorStatus } from "../../generated/prisma/enums.js";

export const creatorStatusSchema = z.enum(CreatorStatus);

export const listCreatorsQuerySchema = z.object({
  status: creatorStatusSchema.optional(),
});

export const creatorUserIdParamSchema = z.object({
  userId: z.uuid(),
});

export type ListCreatorsQuery = z.infer<typeof listCreatorsQuerySchema>;
export type CreatorUserIdParam = z.infer<typeof creatorUserIdParamSchema>;
