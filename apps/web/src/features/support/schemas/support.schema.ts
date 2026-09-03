import { z } from "zod";

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
export const SUPPORT_STATUS_VALUES = [
  "NEW",
  "OPEN",
  "WAITING_ON_CUSTOMER",
  "RESOLVED",
  "CLOSED",
] as const;

export const supportCategorySchema = z.enum(SUPPORT_CATEGORY_VALUES);
export const supportStatusSchema = z.enum(SUPPORT_STATUS_VALUES);
export type SupportCategoryValue = z.infer<typeof supportCategorySchema>;
export type SupportStatusValue = z.infer<typeof supportStatusSchema>;

export const CATEGORY_LABELS: Record<SupportCategoryValue, string> = {
  ORDER_ISSUE: "Problem with an order",
  PAYMENT: "Payment",
  RETURN_REFUND: "Return or refund",
  DELIVERY: "Delivery",
  ACCOUNT_ACCESS: "Account access",
  CREATOR_PROGRAM: "Creator programme",
  BRAND_PARTNER: "Selling on Outfiqe",
  REPORT_CONTENT: "Report something",
  FEEDBACK: "Feedback",
  OTHER: "Something else",
};

export const STATUS_LABELS: Record<SupportStatusValue, string> = {
  NEW: "Received",
  OPEN: "In progress",
  WAITING_ON_CUSTOMER: "Waiting on you",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const supportRequestFormSchema = z.object({
  category: supportCategorySchema,
  subject: z.string().trim().min(3, "Add a short subject").max(140),
  message: z.string().trim().min(20, "Tell us a bit more — at least 20 characters").max(8000),
  relatedOrderId: z.string().optional(),
});
export type SupportRequestFormInput = z.infer<typeof supportRequestFormSchema>;

export const supportMessageSchema = z.object({
  id: z.string(),
  authorKind: z.enum(["REQUESTER", "STAFF", "SYSTEM"]),
  authorName: z.string().nullable(),
  body: z.string(),
  attachmentUrls: z.array(z.string()),
  createdAt: z.string(),
});
export type SupportMessage = z.infer<typeof supportMessageSchema>;

export const supportTicketSchema = z.object({
  id: z.string(),
  reference: z.string(),
  category: supportCategorySchema,
  subject: z.string(),
  status: supportStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number(),
});
export type SupportTicket = z.infer<typeof supportTicketSchema>;

export const supportTicketWithThreadSchema = supportTicketSchema.extend({
  messages: z.array(supportMessageSchema),
});
export type SupportTicketWithThread = z.infer<typeof supportTicketWithThreadSchema>;

export const supportTicketPageSchema = z.object({
  tickets: z.array(supportTicketSchema),
  nextCursor: z.string().nullable(),
});
export type SupportTicketPage = z.infer<typeof supportTicketPageSchema>;

export const createSupportResultSchema = z.object({ reference: z.string(), id: z.string() });
