import { z } from "zod";

export const impersonationScopeSchema = z.enum(["read", "write"]);
export type ImpersonationScope = z.infer<typeof impersonationScopeSchema>;

export const impersonationCandidateSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  roleName: z.string(),
});
export type ImpersonationCandidate = z.infer<typeof impersonationCandidateSchema>;

export const impersonationSessionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string().nullable(),
  impersonatorId: z.string(),
  impersonatorName: z.string().nullable(),
  targetUserId: z.string(),
  targetUserName: z.string().nullable(),
  scope: impersonationScopeSchema,
  reason: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  lastSeenAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  active: z.boolean(),
});
export type ImpersonationSession = z.infer<typeof impersonationSessionSchema>;

export const startImpersonationResultSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  session: impersonationSessionSchema,
});
export type StartImpersonationResult = z.infer<typeof startImpersonationResultSchema>;
