import { z } from "zod";

export const trendDebugParamSchema = z.object({ productId: z.uuid() });

export type TrendDebugParam = z.infer<typeof trendDebugParamSchema>;
