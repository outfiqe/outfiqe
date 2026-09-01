import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type ImpersonationCandidate,
  impersonationCandidateSchema,
  type ImpersonationScope,
  type ImpersonationSession,
  impersonationSessionSchema,
  type StartImpersonationResult,
  startImpersonationResultSchema,
} from "./schemas";

const candidatesListSchema = z.array(impersonationCandidateSchema);
const sessionListSchema = z.array(impersonationSessionSchema);

type StartInput = {
  organizationId: string;
  targetUserId: string;
  reason: string;
  scope: ImpersonationScope;
  ttlMinutes?: number;
};

export const platformImpersonationApi = {
  async listCandidates(organizationId: string): Promise<ImpersonationCandidate[]> {
    const res = await apiClient.get<ImpersonationCandidate[]>(
      "/platform/impersonation/candidates",
      {
        params: { organizationId },
      },
    );
    return candidatesListSchema.parse(res.data);
  },

  async listActive(): Promise<ImpersonationSession[]> {
    const res = await apiClient.get<ImpersonationSession[]>("/platform/impersonation/active");
    return sessionListSchema.parse(res.data);
  },

  async listHistory(organizationId?: string): Promise<ImpersonationSession[]> {
    const res = await apiClient.get<ImpersonationSession[]>("/platform/impersonation", {
      params: organizationId ? { organizationId } : {},
    });
    return sessionListSchema.parse(res.data);
  },

  async start(input: StartInput): Promise<StartImpersonationResult> {
    const res = await apiClient.post<StartImpersonationResult>("/platform/impersonation", {
      organizationId: input.organizationId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      scope: input.scope,
      ...(input.ttlMinutes ? { ttlMinutes: input.ttlMinutes } : {}),
    });
    return startImpersonationResultSchema.parse(res.data);
  },

  async revoke(sessionId: string): Promise<void> {
    await apiClient.del(`/platform/impersonation/${sessionId}`);
  },
};
