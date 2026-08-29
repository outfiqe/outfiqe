import type { CrmActivityType, CrmTaskStatus } from "#generated/prisma/enums.js";

import type { CrmSubjectType } from "./crm-activities.constants.js";

export type SubjectRef = { subjectType: CrmSubjectType; subjectId: string };

export type ActivityRecord = {
  id: string;
  organizationId: string;
  type: CrmActivityType;
  body: string;
  occurredAt: string;
  authorMembershipId: string | null;
  authorName: string | null;
  partnerCreatorId: string | null;
  customerUserId: string | null;
  dealId: string | null;
  createdAt: string;
};

export type TaskRecord = {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  dueAt: string;
  status: CrmTaskStatus;
  assigneeMembershipId: string;
  assigneeName: string | null;
  createdByMembershipId: string | null;
  partnerCreatorId: string | null;
  customerUserId: string | null;
  dealId: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type TimelineEntry =
  | {
      kind: "activity";
      id: string;
      at: string;
      activityType: CrmActivityType;
      body: string;
      authorName: string | null;
    }
  | {
      kind: "order";
      id: string;
      at: string;
      orderId: string;
      itemCount: number;
      amount: number;
      paymentStatus: string;
      fulfilmentStatus: string;
    };

export type Timeline = {
  entries: TimelineEntry[];
  partial: boolean;
};

export type CreateActivityInput = {
  organizationId: string;
  type: CrmActivityType;
  body: string;
  occurredAt: Date;
  authorMembershipId: string | null;
  subject: SubjectRef;
};

export type CreateTaskInput = {
  organizationId: string;
  title: string;
  description: string | null;
  dueAt: Date;
  assigneeMembershipId: string;
  createdByMembershipId: string | null;
  subject: SubjectRef | null;
};
