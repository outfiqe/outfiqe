import { z } from "zod";

import { ParcelReturnOutcome } from "#generated/prisma/enums.js";

const MAX_RETURN_LINES = 100;
const MAX_UNITS_PER_LINE = 1000;
const MAX_NOTE_LENGTH = 500;

const unitCountSchema = z.number().int().min(0).max(MAX_UNITS_PER_LINE);

export const returnShipmentParamSchema = z.object({ shipmentId: z.uuid() });

export const checkInReturnedParcelSchema = z.object({
  outcome: z.enum(ParcelReturnOutcome),
  lines: z
    .array(
      z.object({
        orderItemId: z.uuid(),
        resellableQty: unitCountSchema,
        damagedQty: unitCountSchema,
      }),
    )
    .min(1)
    .max(MAX_RETURN_LINES),
  note: z.string().trim().min(1).max(MAX_NOTE_LENGTH).optional(),
});

export type ReturnShipmentParam = z.infer<typeof returnShipmentParamSchema>;
export type CheckInReturnedParcelBody = z.infer<typeof checkInReturnedParcelSchema>;
