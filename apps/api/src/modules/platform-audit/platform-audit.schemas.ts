import { z } from "zod";

import {
  DEFAULT_PLATFORM_AUDIT_PAGE_SIZE,
  MAX_PLATFORM_AUDIT_PAGE_SIZE,
} from "./platform-audit.constants.js";

export const listPlatformAuditQuerySchema = z.object({
  organizationId: z.uuid().optional(),
  actorUserId: z.uuid().optional(),
  action: z.string().trim().min(1).max(80).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PLATFORM_AUDIT_PAGE_SIZE)
    .optional()
    .default(DEFAULT_PLATFORM_AUDIT_PAGE_SIZE),
});

export type ListPlatformAuditQuery = z.infer<typeof listPlatformAuditQuerySchema>;
