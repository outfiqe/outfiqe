import { z } from "zod";

export const customerRefusalsSchema = z.object({
  isCashOnDeliveryAllowed: z.boolean(),
  refusalCount: z.number(),
  refusalLimit: z.number(),
  windowDays: z.number(),
  refusals: z.array(z.object({ id: z.string(), orderId: z.string(), refusedAt: z.string() })),
});
export type CustomerRefusals = z.infer<typeof customerRefusalsSchema>;
