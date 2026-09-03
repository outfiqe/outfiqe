import { z } from "zod";

export const SUPPORT_STATUS_VALUES = [
  "NEW",
  "OPEN",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
] as const;
export const SUPPORT_CATEGORY_VALUES = [
  "ORDER_ISSUE",
  "PAYMENT",
  "RETURN_REFUND",
  "DELIVERY",
  "ACCOUNT_ACCESS",
  "CREATOR_PROGRAM",
  "BRAND_PARTNER",
  "REPORT_CONTENT",
  "FEEDBACK",
  "OTHER",
] as const;
export const SUPPORT_PRIORITY_VALUES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const SUPPORT_SEGMENT_VALUES = ["SHOPPER", "CREATOR", "BRAND", "GUEST"] as const;
export const SUPPORT_VISIBILITY_VALUES = ["PUBLIC", "INTERNAL"] as const;
export const SUPPORT_AUTHOR_KIND_VALUES = ["REQUESTER", "STAFF", "SYSTEM"] as const;

export const supportStatusSchema = z.enum(SUPPORT_STATUS_VALUES);
export const supportCategorySchema = z.enum(SUPPORT_CATEGORY_VALUES);
export const supportPrioritySchema = z.enum(SUPPORT_PRIORITY_VALUES);
export const supportSegmentSchema = z.enum(SUPPORT_SEGMENT_VALUES);

export type SupportStatusValue = z.infer<typeof supportStatusSchema>;
export type SupportCategoryValue = z.infer<typeof supportCategorySchema>;
export type SupportPriorityValue = z.infer<typeof supportPrioritySchema>;
export type SupportSegmentValue = z.infer<typeof supportSegmentSchema>;
export type SupportVisibilityValue = (typeof SUPPORT_VISIBILITY_VALUES)[number];

export const supportTicketSchema = z.object({
  id: z.string(),
  reference: z.string(),
  ticketNumber: z.number(),
  requesterUserId: z.string().nullable(),
  requesterEmail: z.string(),
  requesterName: z.string(),
  segment: supportSegmentSchema,
  category: supportCategorySchema,
  subject: z.string(),
  status: supportStatusSchema,
  priority: supportPrioritySchema,
  assigneeUserId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  relatedOrderId: z.string().nullable(),
  relatedBrandId: z.string().nullable(),
  relatedBrandName: z.string().nullable(),
  firstRespondedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  lastCustomerAt: z.string().nullable(),
  messageCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupportTicket = z.infer<typeof supportTicketSchema>;

export const supportMessageSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  authorKind: z.enum(SUPPORT_AUTHOR_KIND_VALUES),
  authorUserId: z.string().nullable(),
  authorName: z.string().nullable(),
  visibility: z.enum(SUPPORT_VISIBILITY_VALUES),
  body: z.string(),
  attachmentUrls: z.array(z.string()),
  createdAt: z.string(),
});
export type SupportMessage = z.infer<typeof supportMessageSchema>;

export const supportTicketWithThreadSchema = supportTicketSchema.extend({
  messages: z.array(supportMessageSchema),
});
export type SupportTicketWithThread = z.infer<typeof supportTicketWithThreadSchema>;

export const supportTicketPageSchema = z.object({
  tickets: z.array(supportTicketSchema),
  nextCursor: z.string().nullable(),
});
export type SupportTicketPage = z.infer<typeof supportTicketPageSchema>;

export const supportAgentSchema = z.object({ userId: z.string(), name: z.string() });
export type SupportAgent = z.infer<typeof supportAgentSchema>;

export const supportInboxStatsSchema = z.object({
  open: z.number(),
  unassigned: z.number(),
  awaitingUs: z.number(),
  oldestWaitingAgeHours: z.number().nullable(),
});
export type SupportInboxStats = z.infer<typeof supportInboxStatsSchema>;

export type SupportInboxFilters = {
  status?: SupportStatusValue;
  category?: SupportCategoryValue;
  segment?: SupportSegmentValue;
  assigneeUserId?: string;
  unassigned?: boolean;
  search?: string;
};

export const ALLOWED_SUPPORT_TRANSITIONS: Record<SupportStatusValue, SupportStatusValue[]> = {
  NEW: ["OPEN", "CLOSED"],
  OPEN: ["WAITING_ON_CUSTOMER", "RESOLVED"],
  WAITING_ON_CUSTOMER: ["OPEN", "RESOLVED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
};
