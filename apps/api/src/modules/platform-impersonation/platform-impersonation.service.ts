import { addMinutes } from "date-fns/addMinutes";

import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { platformFeaturesService } from "#modules/platform-features/platform-features.service.js";

import {
  IMPERSONATION_DEFAULT_TTL_MINUTES,
  IMPERSONATION_MAX_TTL_MINUTES,
} from "./platform-impersonation.constants.js";
import { platformImpersonationRepository } from "./platform-impersonation.repository.js";
import { mintImpersonationToken } from "./platform-impersonation.token.js";
import type {
  ImpersonationSessionSummary,
  StartImpersonationInput,
  StartImpersonationResult,
} from "./platform-impersonation.types.js";

const CONFLICT_STATUS = 409;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const BAD_REQUEST_STATUS = 400;
const SECONDS_PER_MINUTE = 60;

const ttlMinutes = (requested?: number): number => {
  if (!requested) return IMPERSONATION_DEFAULT_TTL_MINUTES;
  return Math.min(Math.max(requested, 1), IMPERSONATION_MAX_TTL_MINUTES);
};

export const platformImpersonationService = {
  async start(
    input: StartImpersonationInput & { ttlMinutes?: number },
  ): Promise<StartImpersonationResult> {
    const allowed = await platformFeaturesService.isEnabled(
      input.organizationId,
      "impersonation.allowed",
    );
    if (!allowed) {
      throw new AppError(
        "IMPERSONATION_DISABLED",
        "Impersonation is disabled for this organization.",
        FORBIDDEN_STATUS,
      );
    }

    const membership = await platformImpersonationRepository.findActiveMembership(
      input.targetUserId,
      input.organizationId,
    );
    if (!membership) {
      throw new AppError(
        "TARGET_NOT_A_MEMBER",
        "The target isn't an active member of this organization.",
        BAD_REQUEST_STATUS,
      );
    }

    if (await platformImpersonationRepository.isPlatformStaff(input.targetUserId)) {
      throw new AppError(
        "TARGET_IS_PLATFORM_STAFF",
        "You can't impersonate another platform staff account.",
        FORBIDDEN_STATUS,
      );
    }

    const existing = await platformImpersonationRepository.findActiveForImpersonator(
      input.impersonatorId,
      input.organizationId,
    );
    if (existing) {
      throw new AppError(
        "SESSION_ALREADY_ACTIVE",
        "You already have an active impersonation session for this organization.",
        CONFLICT_STATUS,
      );
    }

    const minutes = ttlMinutes(input.ttlMinutes);
    const expiresAt = addMinutes(new Date(), minutes);
    const session = await platformImpersonationRepository.create(input, expiresAt);

    const token = mintImpersonationToken({
      targetUserId: input.targetUserId,
      impersonatorId: input.impersonatorId,
      sessionId: session.id,
      scope: input.scope,
      ttlSeconds: minutes * SECONDS_PER_MINUTE,
    });

    await platformAudit.record({
      actorUserId: input.impersonatorId,
      onBehalfOfUserId: input.targetUserId,
      action: PLATFORM_AUDIT_ACTION.IMPERSONATION_START,
      summary: `Started a ${input.scope} impersonation session on organization ${input.organizationId}`,
      organizationId: input.organizationId,
      impersonationSessionId: session.id,
      ipAddress: input.ipAddress,
      metadata: { scope: input.scope, reason: input.reason, expiresAt: expiresAt.toISOString() },
    });

    const summaries = await platformImpersonationRepository.hydrate([session]);
    const summary = summaries[0];
    if (!summary) throw new Error("failed to hydrate the impersonation session");
    return { token, expiresAt, session: summary };
  },

  async revoke(sessionId: string, revokedById: string, canManageAny: boolean): Promise<void> {
    const session = await platformImpersonationRepository.findById(sessionId);
    if (!session) {
      throw new AppError("SESSION_NOT_FOUND", "Impersonation session not found.", NOT_FOUND_STATUS);
    }
    if (!canManageAny && session.impersonatorId !== revokedById) {
      throw new AppError(
        "NOT_YOUR_SESSION",
        "You can only revoke your own impersonation sessions.",
        FORBIDDEN_STATUS,
      );
    }
    if (session.revokedAt) return;

    await platformImpersonationRepository.revoke(sessionId, revokedById);
    await platformAudit.record({
      actorUserId: revokedById,
      onBehalfOfUserId: session.targetUserId,
      action: PLATFORM_AUDIT_ACTION.IMPERSONATION_END,
      summary: `Revoked the impersonation session on organization ${session.organizationId}`,
      organizationId: session.organizationId,
      impersonationSessionId: session.id,
    });
  },

  listActive(): Promise<ImpersonationSessionSummary[]> {
    return platformImpersonationRepository.listActive();
  },

  listHistory(filters: {
    organizationId?: string;
    impersonatorId?: string;
    limit: number;
  }): Promise<ImpersonationSessionSummary[]> {
    return platformImpersonationRepository.listHistory(filters);
  },
};
