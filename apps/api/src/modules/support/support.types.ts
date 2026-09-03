import type {
  SupportAuthorKind,
  SupportCategory,
  SupportPriority,
  SupportSegment,
  SupportStatus,
  SupportVisibility,
} from "#generated/prisma/enums.js";

export type SupportRequesterIdentity = {
  userId: string;
  email: string;
  name: string;
  segment: SupportSegment;
  relatedBrandId: string | null;
};

export type CreateSupportTicketInput = {
  requester: SupportRequesterIdentity;
  category: SupportCategory;
  subject: string;
  message: string;
  attachmentUrls: string[];
  relatedOrderId: string | null;
  sourceIp: string | null;
  userAgent: string | null;
};

export type SupportMessageRecord = {
  id: string;
  ticketId: string;
  authorKind: SupportAuthorKind;
  authorUserId: string | null;
  authorName: string | null;
  visibility: SupportVisibility;
  body: string;
  attachmentUrls: string[];
  createdAt: string;
};

export type SupportTicketRecord = {
  id: string;
  reference: string;
  ticketNumber: number;
  requesterUserId: string | null;
  requesterEmail: string;
  requesterName: string;
  segment: SupportSegment;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  assigneeUserId: string | null;
  assigneeName: string | null;
  relatedOrderId: string | null;
  relatedBrandId: string | null;
  relatedBrandName: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  lastCustomerAt: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportTicketWithThread = SupportTicketRecord & {
  messages: SupportMessageRecord[];
};

export type SupportTicketPage = {
  tickets: SupportTicketRecord[];
  nextCursor: string | null;
};

export type SupportTicketFilters = {
  status?: SupportStatus;
  category?: SupportCategory;
  segment?: SupportSegment;
  assigneeUserId?: string;
  unassigned?: boolean;
  search?: string;
};

export type SupportInboxStats = {
  open: number;
  unassigned: number;
  awaitingUs: number;
  oldestWaitingAgeHours: number | null;
};

export type AddSupportMessageInput = {
  ticketId: string;
  authorKind: SupportAuthorKind;
  authorUserId: string | null;
  visibility: SupportVisibility;
  body: string;
  attachmentUrls: string[];
  emailMessageId?: string | null;
};
