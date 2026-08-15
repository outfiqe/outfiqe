import { z } from "zod";

export const paymentOrderIdParamSchema = z.object({
  orderId: z.uuid(),
});

export type PaymentOrderIdParam = z.infer<typeof paymentOrderIdParamSchema>;
