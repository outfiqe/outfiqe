import { isFuture } from "date-fns/isFuture";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_REFERENCE_LENGTH = 120;
const MAX_NOTE_LENGTH = 500;
const MAX_PARCELS_PER_REMITTANCE = 200;
const TRUE_QUERY_VALUE = "true";

const pageSchema = {
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

export const listUnremittedParcelsQuerySchema = z.object({
  partnerId: z.uuid(),
  onlyOverdue: z
    .enum(["true", "false"])
    .optional()
    .transform((onlyOverdue) => onlyOverdue === TRUE_QUERY_VALUE),
  ...pageSchema,
});

export const listCodRemittancesQuerySchema = z.object({
  partnerId: z.uuid().optional(),
  ...pageSchema,
});

export const codRemittanceParamSchema = z.object({ remittanceId: z.uuid() });

export const recordCodRemittanceSchema = z
  .object({
    partnerId: z.uuid(),
    reference: z.string().trim().min(1).max(MAX_REFERENCE_LENGTH),
    receivedAt: z.coerce.date(),
    receivedAmount: z.number().int().min(0),
    note: z.string().trim().min(1).max(MAX_NOTE_LENGTH).optional(),
    lines: z
      .array(z.object({ shipmentId: z.uuid(), partnerFeeAmount: z.number().int().min(0) }))
      .min(1)
      .max(MAX_PARCELS_PER_REMITTANCE),
  })
  .refine(({ receivedAt }) => !isFuture(receivedAt), {
    message: "The date the money arrived can't be in the future.",
    path: ["receivedAt"],
  })
  .refine(({ lines }) => new Set(lines.map(({ shipmentId }) => shipmentId)).size === lines.length, {
    message: "Each parcel can only be ticked once.",
    path: ["lines"],
  });

export type ListUnremittedParcelsQuery = z.infer<typeof listUnremittedParcelsQuerySchema>;
export type ListCodRemittancesQuery = z.infer<typeof listCodRemittancesQuerySchema>;
export type CodRemittanceParam = z.infer<typeof codRemittanceParamSchema>;
export type RecordCodRemittanceBody = z.infer<typeof recordCodRemittanceSchema>;
