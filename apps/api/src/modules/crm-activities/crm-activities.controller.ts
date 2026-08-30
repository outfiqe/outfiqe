import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import {
  getCrmMembership,
  getResolvedOrganization,
} from "#modules/crm-access/crm-access.middleware.js";

import { DEFAULT_TIMELINE_LIMIT } from "./crm-activities.constants.js";
import type {
  ActivityIdParams,
  CreateActivityBody,
  CreateTaskBody,
  ListTasksQuery,
  SubjectQuery,
  TaskIdParams,
  TimelineQuery,
  UpdateTaskBody,
} from "./crm-activities.schemas.js";
import { crmActivitiesService } from "./crm-activities.service.js";
import type { SubjectRef } from "./crm-activities.types.js";

const CREATED_STATUS = 201;

const readSubject = (body: {
  subjectType?: "partner" | "customer" | "deal";
  subjectId?: string;
}): SubjectRef | null =>
  body.subjectType && body.subjectId
    ? { subjectType: body.subjectType, subjectId: body.subjectId }
    : null;

export const crmActivitiesController = {
  async logActivity(_req: Request, res: Response) {
    const body = validated.body<CreateActivityBody>(res);
    const organization = getResolvedOrganization(res);
    const membership = getCrmMembership(res);

    const activity = await crmActivitiesService.logActivity(organization, {
      type: body.type,
      body: body.body,
      occurredAt: body.occurredAt ?? new Date(),
      authorMembershipId: membership.id,
      subject: { subjectType: body.subjectType, subjectId: body.subjectId },
    });
    sendSuccess(res, activity, "Activity logged.", CREATED_STATUS);
  },

  async listActivities(_req: Request, res: Response) {
    const { subjectType, subjectId } = validated.query<SubjectQuery>(res);
    const organization = getResolvedOrganization(res);
    const activities = await crmActivitiesService.listActivities(
      organization.id,
      { subjectType, subjectId },
      DEFAULT_TIMELINE_LIMIT,
    );
    sendSuccess(res, activities, "CRM activities.");
  },

  async deleteActivity(_req: Request, res: Response) {
    const { activityId } = validated.params<ActivityIdParams>(res);
    const organization = getResolvedOrganization(res);
    await crmActivitiesService.deleteActivity(organization.id, activityId);
    sendSuccess(res, null, "Activity deleted.");
  },

  async getTimeline(_req: Request, res: Response) {
    const { subjectType, subjectId, limit } = validated.query<TimelineQuery>(res);
    const organization = getResolvedOrganization(res);
    const timeline = await crmActivitiesService.getTimeline(
      organization,
      { subjectType, subjectId },
      limit ?? DEFAULT_TIMELINE_LIMIT,
    );
    sendSuccess(res, timeline, "CRM timeline.");
  },

  async listTasks(_req: Request, res: Response) {
    const query = validated.query<ListTasksQuery>(res);
    const organization = getResolvedOrganization(res);
    const tasks = await crmActivitiesService.listTasks(organization.id, {
      assigneeMembershipId: query.assigneeMembershipId,
      status: query.status,
      subject: readSubject(query) ?? undefined,
    });
    sendSuccess(res, tasks, "CRM tasks.");
  },

  async createTask(_req: Request, res: Response) {
    const body = validated.body<CreateTaskBody>(res);
    const organization = getResolvedOrganization(res);
    const membership = getCrmMembership(res);
    const principal = requireAuthPrincipal(res);

    const task = await crmActivitiesService.createTask(
      organization,
      {
        title: body.title,
        description: body.description,
        dueAt: body.dueAt ?? crmActivitiesService.defaultTaskDueAt(),
        assigneeMembershipId: body.assigneeMembershipId,
        createdByMembershipId: membership.id,
        subject: readSubject(body),
      },
      principal.userId,
    );
    sendSuccess(res, task, "Task created.", CREATED_STATUS);
  },

  async updateTask(_req: Request, res: Response) {
    const { taskId } = validated.params<TaskIdParams>(res);
    const body = validated.body<UpdateTaskBody>(res);
    const organization = getResolvedOrganization(res);
    const principal = requireAuthPrincipal(res);
    const task = await crmActivitiesService.updateTask(
      organization.id,
      taskId,
      body,
      principal.userId,
    );
    sendSuccess(res, task, "Task updated.");
  },

  async deleteTask(_req: Request, res: Response) {
    const { taskId } = validated.params<TaskIdParams>(res);
    const organization = getResolvedOrganization(res);
    await crmActivitiesService.deleteTask(organization.id, taskId);
    sendSuccess(res, null, "Task deleted.");
  },
};
