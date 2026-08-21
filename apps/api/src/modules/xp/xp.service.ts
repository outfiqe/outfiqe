import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { ONE_DAY_MS } from "./xp.constants.js";
import { xpRepository } from "./xp.repository.js";
import type {
  AwardXpInput,
  AwardXpResult,
  UserProgressView,
  XpTransactionPage,
} from "./xp.types.js";
import {
  computeLevelProgress,
  hasReachedDailyLimit,
  hasReachedMaxPerEntity,
  isWithinCooldown,
  xpToNextLevel,
} from "./xp.utils.js";

const NO_ACTIVE_LEVELS_RESULT: AwardXpResult = { awarded: false, reason: "ACTIVITY_DISABLED" };
const MIN_TOTAL_XP = 0;

const applyXpTransaction = async (input: AwardXpInput, amount: number): Promise<AwardXpResult> => {
  const { userId } = input;

  const activeLevelsDesc = await xpRepository.findActiveLevelsDesc();
  if (activeLevelsDesc.length === 0) {
    logger.error("XP award skipped: no active levels configured.");
    return NO_ACTIVE_LEVELS_RESULT;
  }

  const result = await prisma.$transaction(async (tx) => {
    await xpRepository.createTransaction(tx, { ...input, amount });

    const fallbackLevelId = computeLevelProgress(amount, activeLevelsDesc).level.id;
    const updatedProgress = await xpRepository.incrementProgress(
      tx,
      userId,
      amount,
      fallbackLevelId,
    );
    const { totalXp: updatedTotalXp, currentLevelId: previousCurrentLevelId } = updatedProgress;

    const previousTotalXp = Math.max(updatedTotalXp - amount, MIN_TOTAL_XP);
    const { level: previousLevel } = computeLevelProgress(previousTotalXp, activeLevelsDesc);
    const { level: currentLevel } = computeLevelProgress(updatedTotalXp, activeLevelsDesc);

    if (currentLevel.id !== previousCurrentLevelId) {
      await xpRepository.setCurrentLevel(tx, userId, currentLevel.id);
    }

    return {
      awarded: true,
      amount,
      totalXp: updatedTotalXp,
      previousLevel,
      currentLevel,
      leveledUp: currentLevel.id !== previousLevel.id,
    } satisfies AwardXpResult;
  });

  if (result.awarded && result.leveledUp) {
    await eventBus.publish(DomainEvents.LEVEL_UP, {
      userId,
      previousLevel: { level: result.previousLevel.level, name: result.previousLevel.name },
      currentLevel: {
        level: result.currentLevel.level,
        name: result.currentLevel.name,
        icon: result.currentLevel.icon,
      },
    });
  }

  return result;
};

const awardXp = async (input: AwardXpInput): Promise<AwardXpResult> => {
  const { userId, activityType, relatedEntityId } = input;

  try {
    const activityConfig = await xpRepository.findActivityConfig(activityType);
    if (!activityConfig || !activityConfig.enabled) {
      return { awarded: false, reason: "ACTIVITY_DISABLED" };
    }

    const { xpAmount, maxPerEntity, cooldownSeconds, dailyLimit } = activityConfig;

    if (relatedEntityId && maxPerEntity !== null) {
      const existingAwardCount = await xpRepository.countTransactionsForEntity(
        userId,
        activityType,
        relatedEntityId,
      );
      if (hasReachedMaxPerEntity(existingAwardCount, maxPerEntity)) {
        return { awarded: false, reason: "MAX_PER_ENTITY_REACHED" };
      }
    }

    if (cooldownSeconds !== null) {
      const lastAwardedAt = await xpRepository.findLastAwardedAt(userId, activityType);
      if (isWithinCooldown(lastAwardedAt, cooldownSeconds, new Date())) {
        return { awarded: false, reason: "COOLDOWN_ACTIVE" };
      }
    }

    if (dailyLimit !== null) {
      const dailyWindowStart = new Date(Date.now() - ONE_DAY_MS);
      const xpEarnedInWindow = await xpRepository.sumAmountSince(
        userId,
        activityType,
        dailyWindowStart,
      );
      if (hasReachedDailyLimit(xpEarnedInWindow, xpAmount, dailyLimit)) {
        return { awarded: false, reason: "DAILY_LIMIT_REACHED" };
      }
    }

    return await applyXpTransaction(input, xpAmount);
  } catch (error) {
    logger.error(`Failed to award XP for activity ${activityType}: ${describeError(error)}`);
    return { awarded: false, reason: "ACTIVITY_DISABLED" };
  }
};

const grantFixedXp = async (input: AwardXpInput, amount: number): Promise<AwardXpResult> => {
  try {
    return await applyXpTransaction(input, amount);
  } catch (error) {
    logger.error(
      `Failed to grant fixed XP for activity ${input.activityType}: ${describeError(error)}`,
    );
    return { awarded: false, reason: "ACTIVITY_DISABLED" };
  }
};

const getProgressForUser = async (userId: string): Promise<UserProgressView | null> => {
  const [progress, activeLevelsDesc] = await Promise.all([
    xpRepository.findProgressForUser(userId),
    xpRepository.findActiveLevelsDesc(),
  ]);
  if (!progress) return null;

  const { totalXp, level } = progress;
  const { nextLevel } = computeLevelProgress(totalXp, activeLevelsDesc);

  return { totalXp, level, nextLevel, xpToNextLevel: xpToNextLevel(totalXp, nextLevel) };
};

const listTransactionsForUser = async (
  userId: string,
  params: { cursor?: string; limit: number },
): Promise<XpTransactionPage> => {
  const rows = await xpRepository.listTransactionsForUser(userId, params);
  const { items, nextCursor } = buildCursorPage(rows, params.limit, (row) => row.id);

  return {
    items: items.map((row) => ({
      id: row.id,
      activityType: row.activityType,
      amount: row.amount,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor,
  };
};

export const xpService = {
  awardXp,
  grantFixedXp,
  getProgressForUser,
  listTransactionsForUser,
};
