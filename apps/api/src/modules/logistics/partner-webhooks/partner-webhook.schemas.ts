import { isFuture } from "date-fns/isFuture";
import { z } from "zod";

import { PARTNER_CODE_PATTERN } from "../partners/partner.schemas.js";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const partnerWebhookParamSchema = z.object({
  partnerCode: z.string().regex(PARTNER_CODE_PATTERN),
});

export const partnerReceiptsParamSchema = z.object({ partnerId: z.uuid() });

export const listWebhookReceiptsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const replayWebhookReceiptsSchema = z.object({
  since: z.coerce.date().refine((since) => !isFuture(since), "Pick a time in the past."),
});

export type PartnerWebhookParam = z.infer<typeof partnerWebhookParamSchema>;
export type PartnerReceiptsParam = z.infer<typeof partnerReceiptsParamSchema>;
export type ListWebhookReceiptsQuery = z.infer<typeof listWebhookReceiptsQuerySchema>;
export type ReplayWebhookReceiptsBody = z.infer<typeof replayWebhookReceiptsSchema>;
