import { z } from "zod";

export const CRM_ACTIVITY_TYPES = ["NOTE", "CALL", "MESSAGE", "EMAIL"] as const;
export type CrmActivityTypeValue = (typeof CRM_ACTIVITY_TYPES)[number];

export const crmSubjectTypeSchema = z.enum(["partner", "customer", "deal"]);
export type CrmSubjectTypeValue = z.infer<typeof crmSubjectTypeSchema>;

export const taskStatusSchema = z.enum(["OPEN", "DONE"]);
export type TaskStatusValue = z.infer<typeof taskStatusSchema>;

export const timelineEntrySchema = z.union([
  z.object({
    kind: z.literal("activity"),
    id: z.string(),
    at: z.string(),
    activityType: z.enum(CRM_ACTIVITY_TYPES),
    body: z.string(),
    authorName: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("order"),
    id: z.string(),
    at: z.string(),
    orderId: z.string(),
    itemCount: z.number(),
    amount: z.number(),
    paymentStatus: z.string(),
    fulfilmentStatus: z.string(),
  }),
]);
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

export const timelineSchema = z.object({
  entries: z.array(timelineEntrySchema),
  partial: z.boolean(),
});
export type Timeline = z.infer<typeof timelineSchema>;

export const taskSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dueAt: z.string(),
  status: taskStatusSchema,
  assigneeMembershipId: z.string(),
  assigneeName: z.string().nullable(),
  createdByMembershipId: z.string().nullable(),
  partnerCreatorId: z.string().nullable(),
  customerUserId: z.string().nullable(),
  dealId: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

export const taskListSchema = z.array(taskSchema);
