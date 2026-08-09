import { z } from "zod";

export const followTargetTypeParamSchema = z.enum(["user", "brand"]);
export type FollowTargetTypeParam = z.infer<typeof followTargetTypeParamSchema>;

export const followParamsSchema = z.object({
  targetType: followTargetTypeParamSchema,
  targetId: z.uuid(),
});

export type FollowParams = z.infer<typeof followParamsSchema>;
