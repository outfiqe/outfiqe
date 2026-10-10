import { z } from "zod";

export const platformAuditEntrySchema = z.object({
  id: z.string(),
  actorUserId: z.string(),
  actorName: z.string().nullable(),
  onBehalfOfName: z.string().nullable(),
  action: z.string(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  summary: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});

export const platformAuditPageSchema = z.object({
  entries: z.array(platformAuditEntrySchema),
  nextCursor: z.string().nullable(),
});

export type PlatformAuditEntry = z.infer<typeof platformAuditEntrySchema>;
export type PlatformAuditPage = z.infer<typeof platformAuditPageSchema>;
export type PlatformAuditFilter = { action?: string; targetType?: string; targetId?: string };
