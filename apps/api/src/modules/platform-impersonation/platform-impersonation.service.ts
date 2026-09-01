import { addMinutes } from "date-fns/addMinutes";

import { prisma } from "#db/prisma.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { platformFeaturesService } from "#modules/platform-features/platform-features.service.js";
import { describeError } from "#redis/redis.utils.js";

import {
  IMPERSONATION_DEFAULT_TTL_MINUTES,
  IMPERSONATION_MAX_TTL_MINUTES,
} from "./platform-impersonation.constants.js";
import { platformImpersonationRepository } from "./platform-impersonation.repository.js";
import { mintImpersonationToken } from "./platform-impersonation.token.js";
import type {
  ImpersonationCandidate,
  ImpersonationSessionSummary,
  StartImpersonationInput,
  StartImpersonationResult,
  TenantImpersonationLogEntry,
} from "./platform-impersonation.types.js";

const CONFLICT_STATUS = 409;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const BAD_REQUEST_STATUS = 400;
const SECONDS_PER_MINUTE = 60;
const TENANT_LOG_LIMIT = 50;

const ttlMinutes = (requested?: number): number => {
  if (!requested) return IMPERSONATION_DEFAULT_TTL_MINUTES;
  return Math.min(Math.max(requested, 1), IMPERSONATION_MAX_TTL_MINUTES);
};

const notifyTarget = async (
  targetUserId: string,
  organizationId: string,
  expiresAt: Date,
): Promise<void> => {
  try {
    const [target, organization] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { email: true } }),
      prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
    ]);
    if (!target?.email) return;
    await sendEmail({
      to: target.email,
      subject: "Outfiqe support is accessing your account",
      body:
        `An Outfiqe staff member has started a support session in ${organization?.name ?? "your organization"}. ` +
        `It ends automatically at ${expiresAt.toISOString()}. If you didn't expect this, contact us.`,
    });
  } catch (error) {
    logger.error(`Impersonation notification failed for ${targetUserId}: ${describeError(error)}`);
  }
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

    void notifyTarget(input.targetUserId, input.organizationId, expiresAt);

    const summaries = await platformImpersonationRepository.hydrate([session]);
    const summary = summaries[0];
    if (!summary) throw new Error("failed to hydrate the impersonation session");
    return { token, expiresAt, session: summary };
  },

  async findActiveForOrganization(
    organizationId: string,
  ): Promise<{ byName: string | null; since: Date } | null> {
    const session = await platformImpersonationRepository.findActiveForOrganization(organizationId);
    if (!session) return null;
    const [summary] = await platformImpersonationRepository.hydrate([session]);
    return { byName: summary?.impersonatorName ?? null, since: session.createdAt };
  },

  tenantLog(organizationId: string): Promise<TenantImpersonationLogEntry[]> {
    return platformImpersonationRepository.listOrganizationLog(organizationId, TENANT_LOG_LIMIT);
  },

  async endAllForOrganization(organizationId: string, endedByUserId: string): Promise<number> {
    const sessions =
      await platformImpersonationRepository.listActiveForOrganization(organizationId);
    for (const session of sessions) {
      await platformImpersonationRepository.revoke(session.id, endedByUserId);
      await platformAudit.record({
        actorUserId: endedByUserId,
        onBehalfOfUserId: session.targetUserId,
        action: PLATFORM_AUDIT_ACTION.IMPERSONATION_END,
        summary: `The organization ended an impersonation session on organization ${organizationId}`,
        organizationId,
        impersonationSessionId: session.id,
      });
    }
    return sessions.length;
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

  listCandidates(organizationId: string): Promise<ImpersonationCandidate[]> {
    return platformImpersonationRepository.listImpersonationCandidates(organizationId);
  },

  listHistory(filters: {
    organizationId?: string;
    impersonatorId?: string;
    limit: number;
  }): Promise<ImpersonationSessionSummary[]> {
    return platformImpersonationRepository.listHistory(filters);
  },

  reapExpiredSessions(): Promise<number> {
    return platformImpersonationRepository.reapExpired();
  },
};
