import { z } from "zod";

export const RIDER_TASK_STATUS = {
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  WASTED: "WASTED",
  CANCELLED: "CANCELLED",
} as const;

export const riderTaskStatusSchema = z.enum(RIDER_TASK_STATUS);
export type RiderTaskStatus = z.infer<typeof riderTaskStatusSchema>;

export const RIDER_STOP_DIRECTION = { COLLECT: "COLLECT", RETURN: "RETURN" } as const;

export const riderTaskStopSchema = z.object({
  id: z.string(),
  direction: z.enum(RIDER_STOP_DIRECTION).default(RIDER_STOP_DIRECTION.COLLECT),
  brandReturn: z
    .object({
      brandReturnId: z.string(),
      orderId: z.string(),
      source: z.enum(["PARCEL_RETURNED", "FAILED_INSPECTION"]),
      unitCount: z.number(),
    })
    .nullable()
    .default(null),
  fulfilmentGroupId: z.string(),
  orderId: z.string(),
  itemCount: z.number(),
  isCollected: z.boolean(),
  bagTagCode: z.string().nullable(),
});
export type RiderTaskStop = z.infer<typeof riderTaskStopSchema>;

export const riderTaskSchema = z.object({
  id: z.string(),
  status: riderTaskStatusSchema,
  roundStartsAt: z.string(),
  brandName: z.string(),
  pickupLocation: z.object({
    label: z.string(),
    contactName: z.string(),
    contactPhoneE164: z.string(),
    address: z.string(),
    landmark: z.string().nullable(),
    city: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    openingNote: z.string().nullable(),
  }),
  stops: z.array(riderTaskStopSchema),
});
export type RiderTask = z.infer<typeof riderTaskSchema>;

export const riderTasksResponseSchema = z.object({ tasks: z.array(riderTaskSchema) });
