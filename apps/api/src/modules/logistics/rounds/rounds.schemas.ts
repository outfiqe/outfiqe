import {
  BAG_TAG_CODE_LENGTH,
  isCrockfordCode,
  normalizeTypedCode,
  PICKUP_CODE_LENGTH,
} from "@outfiqe/utils";
import { z } from "zod";

import { RiderTaskStatus } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_PICKUPS_PER_VISIT = 50;
const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 200;

const hasNoDuplicates = (values: readonly string[]) => new Set(values).size === values.length;

const typedCodeSchema = (expectedLength: number, message: string) =>
  z
    .string()
    .transform(normalizeTypedCode)
    .refine((code) => isCrockfordCode(code, expectedLength), message);

const isoDateSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const pageFields = {
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

export const pickupBoardQuerySchema = z.object({ hubId: z.uuid(), ...pageFields });

export const assignRiderTaskSchema = z.object({
  riderId: z.uuid(),
  pickupLocationId: z.uuid(),
  fulfilmentGroupIds: z
    .array(z.uuid())
    .min(1)
    .max(MAX_PICKUPS_PER_VISIT)
    .refine(hasNoDuplicates, "Each pickup can only be added once."),
  roundStartsAt: isoDateSchema,
});

export const listRiderTasksQuerySchema = z.object({
  hubId: z.uuid(),
  riderId: z.uuid().optional(),
  status: z.enum(RiderTaskStatus).optional(),
  ...pageFields,
});

export const riderTaskIdParamSchema = z.object({ taskId: z.uuid() });

export const collectScanSchema = z.object({
  pickupCode: typedCodeSchema(PICKUP_CODE_LENGTH, "That isn't a valid pickup code."),
  bagTagCode: typedCodeSchema(BAG_TAG_CODE_LENGTH, "That isn't a valid bag sticker code."),
  scannedAt: isoDateSchema,
});

export const wastedVisitSchema = z.object({
  reason: z.string().trim().min(MIN_REASON_LENGTH).max(MAX_REASON_LENGTH),
});

export type PickupBoardQuery = z.infer<typeof pickupBoardQuerySchema>;
export type AssignRiderTaskBody = z.infer<typeof assignRiderTaskSchema>;
export type ListRiderTasksQuery = z.infer<typeof listRiderTasksQuerySchema>;
export type RiderTaskIdParam = z.infer<typeof riderTaskIdParamSchema>;
export type CollectScanBody = z.infer<typeof collectScanSchema>;
export type WastedVisitBody = z.infer<typeof wastedVisitSchema>;
