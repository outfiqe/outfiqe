import { z } from "zod";

import { CrmActivityType, CrmTaskStatus } from "#generated/prisma/enums.js";

import { CRM_SUBJECT_TYPES, MAX_TIMELINE_LIMIT } from "./crm-activities.constants.js";

const subjectShape = {
  subjectType: z.enum(CRM_SUBJECT_TYPES),
  subjectId: z.uuid(),
};

export const subjectQuerySchema = z.object(subjectShape);

export const timelineQuerySchema = z.object({
  ...subjectShape,
  limit: z.coerce.number().int().min(1).max(MAX_TIMELINE_LIMIT).optional(),
});

export const createActivitySchema = z.object({
  ...subjectShape,
  type: z.enum(CrmActivityType),
  body: z.string().trim().min(1).max(4000),
  occurredAt: z.coerce.date().optional(),
});

export const activityIdParamsSchema = z.object({ activityId: z.uuid() });

export const listTasksQuerySchema = z.object({
  assigneeMembershipId: z.uuid().optional(),
  status: z.enum(CrmTaskStatus).optional(),
  subjectType: z.enum(CRM_SUBJECT_TYPES).optional(),
  subjectId: z.uuid().optional(),
});

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).nullable().optional().default(null),
    dueAt: z.coerce.date().optional(),
    assigneeMembershipId: z.uuid(),
    subjectType: z.enum(CRM_SUBJECT_TYPES).optional(),
    subjectId: z.uuid().optional(),
  })
  .refine((body) => (body.subjectType === undefined) === (body.subjectId === undefined), {
    message: "subjectType and subjectId must be provided together.",
  });

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    dueAt: z.coerce.date().optional(),
    assigneeMembershipId: z.uuid().optional(),
    status: z.enum(CrmTaskStatus).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update.",
  });

export const taskIdParamsSchema = z.object({ taskId: z.uuid() });

export type SubjectQuery = z.infer<typeof subjectQuerySchema>;
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type CreateActivityBody = z.infer<typeof createActivitySchema>;
export type ActivityIdParams = z.infer<typeof activityIdParamsSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
export type TaskIdParams = z.infer<typeof taskIdParamsSchema>;
