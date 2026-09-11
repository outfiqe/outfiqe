import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { UserRole } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { authRepository } from "#modules/auth/auth.repository.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { userRepository } from "#modules/users/user.repository.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { SUSPENSION_REDIS_TTL_PADDING_SECONDS } from "./platform-suspensions.constants.js";
import { platformSuspensionsRepository } from "./platform-suspensions.repository.js";
import type {
  BanUserInput,
  LiftUserSuspensionInput,
  SuspendUserInput,
} from "./platform-suspensions.types.js";

const HOURS_TO_MS = 60 * 60 * 1000;
const FORBIDDEN_STATUS = 403;
const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;
const USER_NOT_FOUND_MESSAGE = "User not found.";
const TARGET_TYPE_USER = "user";

const assertNotSelf = (actorUserId: string, targetUserId: string): void => {
  if (actorUserId === targetUserId) {
    throw new AppError(
      "CANNOT_MODERATE_SELF",
      "You cannot suspend or ban your own account.",
      FORBIDDEN_STATUS,
    );
  }
};

const assertTargetIsModerable = (target: { role: UserRole } | null): void => {
  if (!target) throw new AppError("USER_NOT_FOUND", USER_NOT_FOUND_MESSAGE, NOT_FOUND_STATUS);
  if (target.role === UserRole.ADMIN) {
    throw new AppError(
      "CANNOT_MODERATE_ADMIN",
      "Admin accounts cannot be suspended or banned.",
      FORBIDDEN_STATUS,
    );
  }
};

const writeSuspendedRedisFlag = async (
  userId: string,
  reason: string,
  expiresAt: Date | null,
): Promise<void> => {
  try {
    const value = JSON.stringify({ reason, expiresAt: expiresAt ? expiresAt.toISOString() : null });
    if (expiresAt) {
      const ttlSeconds = Math.max(
        1,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000) +
          SUSPENSION_REDIS_TTL_PADDING_SECONDS,
      );
      await redis.set(redisKeys.suspendedUser(userId), value, "EX", ttlSeconds);
    } else {
      await redis.set(redisKeys.suspendedUser(userId), value);
    }
  } catch (error) {
    logger.error(`Failed to write suspension flag for user ${userId}: ${describeError(error)}`);
  }
};

const clearSuspendedRedisFlag = async (userId: string): Promise<void> => {
  try {
    await redis.del(redisKeys.suspendedUser(userId));
  } catch (error) {
    logger.error(`Failed to clear suspension flag for user ${userId}: ${describeError(error)}`);
  }
};

export const platformSuspensionsService = {
  async suspendUser(input: SuspendUserInput): Promise<void> {
    const { targetUserId, actorUserId, reason, durationHours } = input;
    assertNotSelf(actorUserId, targetUserId);
    assertTargetIsModerable(await userRepository.findById(targetUserId));

    const expiresAt = durationHours ? new Date(Date.now() + durationHours * HOURS_TO_MS) : null;

    const changed = await prisma.$transaction(async (tx) => {
      const ok = await platformSuspensionsRepository.suspendUser(
        { userId: targetUserId, suspendedBy: actorUserId, reason, expiresAt },
        tx,
      );
      if (!ok) return false;
      await authRepository.deleteAllRefreshTokensForUser(targetUserId, tx);
      return true;
    });

    if (!changed) {
      throw new AppError(
        "ALREADY_SUSPENDED",
        "This account is already suspended or banned.",
        CONFLICT_STATUS,
      );
    }

    await writeSuspendedRedisFlag(targetUserId, reason, expiresAt);

    await platformAudit.record({
      actorUserId,
      action: PLATFORM_AUDIT_ACTION.USER_SUSPENDED,
      summary: `Suspended user ${targetUserId}${durationHours ? ` for ${durationHours}h` : " indefinitely"}: ${reason}`,
      targetType: TARGET_TYPE_USER,
      targetId: targetUserId,
      metadata: {
        reason,
        durationHours: durationHours ?? null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      },
    });

    await eventBus.publish(DomainEvents.USER_SUSPENDED, {
      userId: targetUserId,
      reason,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });
  },

  async banUser(input: BanUserInput): Promise<void> {
    const { targetUserId, actorUserId, reason } = input;
    assertNotSelf(actorUserId, targetUserId);
    assertTargetIsModerable(await userRepository.findById(targetUserId));

    const changed = await prisma.$transaction(async (tx) => {
      const ok = await platformSuspensionsRepository.banUser(
        { userId: targetUserId, suspendedBy: actorUserId, reason },
        tx,
      );
      if (!ok) return false;
      await authRepository.deleteAllRefreshTokensForUser(targetUserId, tx);
      return true;
    });

    if (!changed) {
      throw new AppError("ALREADY_BANNED", "This account is already banned.", CONFLICT_STATUS);
    }

    await writeSuspendedRedisFlag(targetUserId, reason, null);

    await platformAudit.record({
      actorUserId,
      action: PLATFORM_AUDIT_ACTION.USER_BANNED,
      summary: `Banned user ${targetUserId}: ${reason}`,
      targetType: TARGET_TYPE_USER,
      targetId: targetUserId,
      metadata: { reason },
    });

    await eventBus.publish(DomainEvents.USER_BANNED, { userId: targetUserId, reason });
  },

  async unsuspendUser(input: LiftUserSuspensionInput): Promise<void> {
    const { targetUserId, actorUserId } = input;

    const changed = await platformSuspensionsRepository.unsuspendUser(targetUserId);
    if (!changed) {
      throw new AppError(
        "NOT_SUSPENDED",
        "This account is not currently suspended.",
        CONFLICT_STATUS,
      );
    }

    await clearSuspendedRedisFlag(targetUserId);

    if (actorUserId) {
      await platformAudit.record({
        actorUserId,
        action: PLATFORM_AUDIT_ACTION.USER_UNSUSPENDED,
        summary: `Unsuspended user ${targetUserId}`,
        targetType: TARGET_TYPE_USER,
        targetId: targetUserId,
      });
    } else {
      logger.info(`Suspension expiry sweep lifted the suspension on user ${targetUserId}`);
    }

    await eventBus.publish(DomainEvents.USER_UNSUSPENDED, { userId: targetUserId });
  },

  async unbanUser(input: { targetUserId: string; actorUserId: string }): Promise<void> {
    const { targetUserId, actorUserId } = input;

    const bannedByAdminId =
      await platformSuspensionsRepository.findLatestBanActorUserId(targetUserId);
    if (bannedByAdminId && bannedByAdminId === actorUserId) {
      throw new AppError(
        "BAN_REQUIRES_SECOND_ADMIN",
        "A ban must be lifted by a different admin than the one who imposed it.",
        FORBIDDEN_STATUS,
      );
    }

    const changed = await platformSuspensionsRepository.unbanUser(targetUserId);
    if (!changed) {
      throw new AppError("NOT_BANNED", "This account is not currently banned.", CONFLICT_STATUS);
    }

    await clearSuspendedRedisFlag(targetUserId);

    await platformAudit.record({
      actorUserId,
      action: PLATFORM_AUDIT_ACTION.USER_UNBANNED,
      summary: `Lifted the ban on user ${targetUserId}`,
      targetType: TARGET_TYPE_USER,
      targetId: targetUserId,
    });

    await eventBus.publish(DomainEvents.USER_UNSUSPENDED, { userId: targetUserId });
  },
};
