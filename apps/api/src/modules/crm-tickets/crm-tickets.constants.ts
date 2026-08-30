import { CrmTicketStatus } from "#generated/prisma/enums.js";

export const TICKET_SUBJECT_TYPES = ["partner", "customer"] as const;
export type TicketSubjectType = (typeof TICKET_SUBJECT_TYPES)[number];

export const ALLOWED_TICKET_TRANSITIONS: Record<CrmTicketStatus, CrmTicketStatus[]> = {
  [CrmTicketStatus.OPEN]: [CrmTicketStatus.IN_PROGRESS, CrmTicketStatus.RESOLVED],
  [CrmTicketStatus.IN_PROGRESS]: [CrmTicketStatus.RESOLVED, CrmTicketStatus.OPEN],
  [CrmTicketStatus.RESOLVED]: [CrmTicketStatus.CLOSED, CrmTicketStatus.IN_PROGRESS],
  [CrmTicketStatus.CLOSED]: [CrmTicketStatus.IN_PROGRESS],
};

export const RESOLVED_TICKET_STATUSES: CrmTicketStatus[] = [
  CrmTicketStatus.RESOLVED,
  CrmTicketStatus.CLOSED,
];

export const DEFAULT_TICKET_PAGE_SIZE = 50;

export const MAX_TICKET_PAGE_SIZE = 200;
