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

export const pickupBoardLocationSchema = z.object({
  pickupLocationId: z.string(),
  label: z.string(),
  brandId: z.string(),
  brandName: z.string(),
  address: z.string(),
  city: z.string(),
  pickups: z.array(
    z.object({
      fulfilmentGroupId: z.string(),
      orderId: z.string(),
      itemCount: z.number(),
      readyForPickupAt: z.string().nullable(),
    }),
  ),
});
export type PickupBoardLocation = z.infer<typeof pickupBoardLocationSchema>;

export const pickupBoardPageSchema = z.object({
  items: z.array(pickupBoardLocationSchema),
  nextCursor: z.string().nullable(),
});
export type PickupBoardPage = z.infer<typeof pickupBoardPageSchema>;

export const riderTaskSummarySchema = z.object({
  id: z.string(),
  status: riderTaskStatusSchema,
  roundStartsAt: z.string(),
  riderId: z.string(),
  riderName: z.string(),
  brandName: z.string(),
  pickupLocationLabel: z.string(),
  stopCount: z.number(),
  collectedCount: z.number(),
  assignedAt: z.string(),
  completedAt: z.string().nullable(),
  wastedReason: z.string().nullable(),
});
export type RiderTaskSummary = z.infer<typeof riderTaskSummarySchema>;

export const riderTasksPageSchema = z.object({
  items: z.array(riderTaskSummarySchema),
  nextCursor: z.string().nullable(),
});
export type RiderTasksPage = z.infer<typeof riderTasksPageSchema>;

export type AssignRiderTaskBody = {
  riderId: string;
  pickupLocationId: string;
  fulfilmentGroupIds: string[];
  roundStartsAt: string;
};
