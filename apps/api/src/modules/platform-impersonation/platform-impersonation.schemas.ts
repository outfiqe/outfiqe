import { z } from "zod";

import {
  IMPERSONATION_MAX_TTL_MINUTES,
  IMPERSONATION_SCOPES,
} from "./platform-impersonation.constants.js";

export const startImpersonationBodySchema = z.object({
  organizationId: z.uuid(),
  targetUserId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
  scope: z.enum(IMPERSONATION_SCOPES).optional().default("read"),
  ttlMinutes: z.coerce.number().int().min(1).max(IMPERSONATION_MAX_TTL_MINUTES).optional(),
});

export const sessionIdParamsSchema = z.object({ sessionId: z.uuid() });

export const historyQuerySchema = z.object({
  organizationId: z.uuid().optional(),
  impersonatorId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type StartImpersonationBody = z.infer<typeof startImpersonationBodySchema>;
export type SessionIdParams = z.infer<typeof sessionIdParamsSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
