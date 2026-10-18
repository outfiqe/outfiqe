import { z } from "zod";

export const pickupGroupIdParamSchema = z.object({ fulfilmentGroupId: z.uuid() });

export type PickupGroupIdParam = z.infer<typeof pickupGroupIdParamSchema>;
