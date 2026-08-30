import { addDays } from "date-fns/addDays";

import { DomainEvents, eventBus } from "#events/event-bus.js";
import { CrmTaskStatus } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { crmPipelineRepository } from "#modules/crm-pipeline/crm-pipeline.repository.js";
import { crmRelationshipsService } from "#modules/crm-relationships/crm-relationships.service.js";
import { describeError } from "#redis/redis.utils.js";

import { crmActivitiesRepository } from "./crm-activities.repository.js";
import type {
  ActivityRecord,
  CreateActivityInput,
  CreateTaskInput,
  SubjectRef,
  TaskRecord,
  Timeline,
} from "./crm-activities.types.js";

const NOT_FOUND_STATUS = 404;
const BAD_REQUEST_STATUS = 400;

type TenantOrganization = { id: string; linkedBrandId: string | null };

const requireValidSubject = async (
  organization: TenantOrganization,
  subject: SubjectRef,
): Promise<void> => {
  if (subject.subjectType === "partner") {
    if (!(await crmRelationshipsService.isPartner(organization, subject.subjectId))) {
      throw new AppError("SUBJECT_NOT_FOUND", "That partner isn't in this CRM.", NOT_FOUND_STATUS);
    }
    return;
  }
  if (subject.subjectType === "customer") {
    if (!(await crmRelationshipsService.isCustomer(organization, subject.subjectId))) {
      throw new AppError("SUBJECT_NOT_FOUND", "That customer isn't in this CRM.", NOT_FOUND_STATUS);
    }
    return;
  }
  const deal = await crmPipelineRepository.findDeal(organization.id, subject.subjectId);
  if (!deal) {
    throw new AppError("SUBJECT_NOT_FOUND", "That deal isn't in this CRM.", NOT_FOUND_STATUS);
  }
};

const resolveDealPartner = async (
  organizationId: string,
  dealId: string,
): Promise<string | null> => {
  const deal = await crmPipelineRepository.findDeal(organizationId, dealId);
  return deal?.partnerCreatorId ?? null;
};

const publishTaskAssignment = async (
  organizationId: string,
  task: TaskRecord,
  assigneeUserId: string,
  assignedByUserId: string | null,
): Promise<void> => {
  await eventBus.publish(DomainEvents.CRM_ITEM_ASSIGNED, {
    organizationId,
    itemKind: "task",
    itemId: task.id,
    title: task.title,
    assigneeUserId,
    assignedByUserId,
  });
};

export const crmActivitiesService = {
  async logActivity(
    organization: TenantOrganization,
    input: Omit<CreateActivityInput, "organizationId">,
  ): Promise<ActivityRecord> {
    await requireValidSubject(organization, input.subject);
    return crmActivitiesRepository.createActivity({ ...input, organizationId: organization.id });
  },

  listActivities(
    organizationId: string,
    subject: SubjectRef,
    limit: number,
  ): Promise<ActivityRecord[]> {
    return crmActivitiesRepository.listActivitiesForSubject(organizationId, subject, limit);
  },

  async deleteActivity(organizationId: string, activityId: string): Promise<void> {
    const existing = await crmActivitiesRepository.findActivity(organizationId, activityId);
    if (!existing)
      throw new AppError("ACTIVITY_NOT_FOUND", "Activity not found.", NOT_FOUND_STATUS);
    await crmActivitiesRepository.deleteActivity(organizationId, activityId);
  },

  async getTimeline(
    organization: TenantOrganization,
    subject: SubjectRef,
    limit: number,
  ): Promise<Timeline> {
    await requireValidSubject(organization, subject);

    if (organization.linkedBrandId) {
      try {
        const attributedCreatorId =
          subject.subjectType === "partner"
            ? subject.subjectId
            : subject.subjectType === "deal"
              ? await resolveDealPartner(organization.id, subject.subjectId)
              : null;
        const buyerUserId = subject.subjectType === "customer" ? subject.subjectId : null;

        const entries = await crmActivitiesRepository.timelineForSubject(
          organization.id,
          organization.linkedBrandId,
          subject,
          { attributedCreatorId, buyerUserId },
          limit,
        );
        return { entries, partial: false };
      } catch (error) {
        logger.error(
          `CRM timeline merge failed, falling back to activities: ${describeError(error)}`,
        );
      }
    }

    const activities = await crmActivitiesRepository.listActivitiesForSubject(
      organization.id,
      subject,
      limit,
    );
    return {
      entries: activities.map((activity) => ({
        kind: "activity",
        id: `activity:${activity.id}`,
        at: activity.occurredAt,
        activityType: activity.type,
        body: activity.body,
        authorName: activity.authorName,
      })),
      partial: Boolean(organization.linkedBrandId),
    };
  },

  async createTask(
    organization: TenantOrganization,
    input: Omit<CreateTaskInput, "organizationId">,
    actorUserId: string | null,
  ): Promise<TaskRecord> {
    if (input.subject) await requireValidSubject(organization, input.subject);
    const assignee = await this.requireMembership(organization.id, input.assigneeMembershipId);

    const task = await crmActivitiesRepository.createTask({
      ...input,
      organizationId: organization.id,
    });
    await publishTaskAssignment(organization.id, task, assignee.userId, actorUserId);
    return task;
  },

  listTasks(
    organizationId: string,
    filters: {
      assigneeMembershipId?: string;
      status?: CrmTaskStatus;
      subject?: SubjectRef;
    },
  ): Promise<TaskRecord[]> {
    return crmActivitiesRepository.listTasks(organizationId, filters);
  },

  async updateTask(
    organizationId: string,
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      dueAt?: Date;
      assigneeMembershipId?: string;
      status?: CrmTaskStatus;
    },
    actorUserId: string | null,
  ): Promise<TaskRecord> {
    const existing = await crmActivitiesRepository.findTask(organizationId, taskId);
    if (!existing) throw new AppError("TASK_NOT_FOUND", "Task not found.", NOT_FOUND_STATUS);

    let reassignedUserId: string | null = null;
    if (data.assigneeMembershipId && data.assigneeMembershipId !== existing.assigneeMembershipId) {
      reassignedUserId = (await this.requireMembership(organizationId, data.assigneeMembershipId))
        .userId;
    }

    const completedAt =
      data.status === CrmTaskStatus.DONE
        ? new Date()
        : data.status === CrmTaskStatus.OPEN
          ? null
          : undefined;

    const task = await crmActivitiesRepository.updateTask(organizationId, taskId, {
      ...data,
      ...(completedAt !== undefined ? { completedAt } : {}),
    });

    if (reassignedUserId) {
      await publishTaskAssignment(organizationId, task, reassignedUserId, actorUserId);
    }
    return task;
  },

  async deleteTask(organizationId: string, taskId: string): Promise<void> {
    const existing = await crmActivitiesRepository.findTask(organizationId, taskId);
    if (!existing) throw new AppError("TASK_NOT_FOUND", "Task not found.", NOT_FOUND_STATUS);
    await crmActivitiesRepository.deleteTask(organizationId, taskId);
  },

  async requireMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<{ id: string; userId: string }> {
    const membership = await crmActivitiesRepository.findMembership(organizationId, membershipId);
    if (!membership) {
      throw new AppError(
        "MEMBERSHIP_NOT_FOUND",
        "That teammate isn't a member of this organization.",
        BAD_REQUEST_STATUS,
      );
    }
    return membership;
  },

  defaultTaskDueAt(): Date {
    return addDays(new Date(), 3);
  },
};
