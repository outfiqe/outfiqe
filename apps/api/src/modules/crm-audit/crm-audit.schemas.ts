import { z } from "zod";

import { DEFAULT_AUDIT_PAGE_SIZE, MAX_AUDIT_PAGE_SIZE } from "./crm-audit.constants.js";

export const listAuditQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_AUDIT_PAGE_SIZE)
    .optional()
    .default(DEFAULT_AUDIT_PAGE_SIZE),
});

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
