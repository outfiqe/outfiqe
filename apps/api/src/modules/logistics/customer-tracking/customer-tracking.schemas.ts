import { z } from "zod";

const MIN_DISPUTE_DETAILS_LENGTH = 10;
const MAX_DISPUTE_DETAILS_LENGTH = 1000;

export const customerOrderParamSchema = z.object({ orderId: z.uuid() });

export const reportNotReceivedSchema = z.object({
  shipmentId: z.uuid(),
  details: z.string().trim().min(MIN_DISPUTE_DETAILS_LENGTH).max(MAX_DISPUTE_DETAILS_LENGTH),
});

export type CustomerOrderParam = z.infer<typeof customerOrderParamSchema>;
export type ReportNotReceivedBody = z.infer<typeof reportNotReceivedSchema>;
