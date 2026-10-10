import { z } from "zod";

export const crmAuditEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  outcome: z.string(),
  summary: z.string(),
  actorUserId: z.string().nullable(),
  actorName: z.string().nullable(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});
export type CrmAuditEntry = z.infer<typeof crmAuditEntrySchema>;

export const crmAuditPageSchema = z.object({
  entries: z.array(crmAuditEntrySchema),
  nextCursor: z.string().nullable(),
});
export type CrmAuditPage = z.infer<typeof crmAuditPageSchema>;
