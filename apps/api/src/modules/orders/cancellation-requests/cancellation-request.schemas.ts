import { z } from "zod";

import { refundReasonSchema } from "../refunds/refund.schemas.js";
import { CANCELLATION_REQUEST_PAGE_SIZE } from "./cancellation-request.constants.js";

const { default: DEFAULT_PAGE_SIZE, max: MAX_PAGE_SIZE } = CANCELLATION_REQUEST_PAGE_SIZE;

export const listCancellationRequestsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const cancellationRequestGroupParamSchema = z.object({ groupId: z.uuid() });

export const rejectCancellationRequestSchema = z.object({ note: refundReasonSchema });

export type ListCancellationRequestsQuery = z.infer<typeof listCancellationRequestsQuerySchema>;
export type CancellationRequestGroupParam = z.infer<typeof cancellationRequestGroupParamSchema>;
export type RejectCancellationRequestBody = z.infer<typeof rejectCancellationRequestSchema>;
