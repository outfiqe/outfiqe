import type { CrmTicketStatus, CrmTicketType } from "#generated/prisma/enums.js";

import type { TicketSubjectType } from "./crm-tickets.constants.js";

export type TicketSubjectRef = { subjectType: TicketSubjectType; subjectId: string };

export type TicketCommentRecord = {
  id: string;
  ticketId: string;
  authorMembershipId: string | null;
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type TicketRecord = {
  id: string;
  organizationId: string;
  type: CrmTicketType;
  status: CrmTicketStatus;
  title: string;
  description: string;
  partnerCreatorId: string | null;
  customerUserId: string | null;
  assigneeMembershipId: string | null;
  assigneeName: string | null;
  createdByMembershipId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketWithComments = TicketRecord & {
  comments: TicketCommentRecord[];
};

export type CreateTicketInput = {
  organizationId: string;
  type: CrmTicketType;
  title: string;
  description: string;
  subject: TicketSubjectRef;
  assigneeMembershipId: string | null;
  createdByMembershipId: string | null;
};
