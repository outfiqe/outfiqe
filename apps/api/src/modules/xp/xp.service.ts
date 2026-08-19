import { prisma } from "#db/prisma.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { ONE_DAY_MS } from "./xp.constants.js";
import { xpRepository } from "./xp.repository.js";
import type { AwardXpInput, AwardXpResult, UserProgressView } from "./xp.types.js";
import {
  computeLevelProgress,
  hasReachedDailyLimit,
  hasReachedMaxPerEntity,
  isWithinCooldown,
  xpToNextLevel,
} from "./xp.utils.js";

const NO_ACTIVE_LEVELS_RESULT: AwardXpResult = { awarded: false, reason: "ACTIVITY_DISABLED" };
const MIN_TOTAL_XP = 0;

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

    const activeLevelsDesc = await xpRepository.findActiveLevelsDesc();
    if (activeLevelsDesc.length === 0) {
      logger.error("XP award skipped: no active levels configured.");
      return NO_ACTIVE_LEVELS_RESULT;
    }

    return await prisma.$transaction(async (tx) => {
      await xpRepository.createTransaction(tx, { ...input, amount: xpAmount });

      const fallbackLevelId = computeLevelProgress(xpAmount, activeLevelsDesc).level.id;
      const updatedProgress = await xpRepository.incrementProgress(
        tx,
        userId,
        xpAmount,
        fallbackLevelId,
      );
      const { totalXp: updatedTotalXp, currentLevelId: previousCurrentLevelId } = updatedProgress;

      const previousTotalXp = Math.max(updatedTotalXp - xpAmount, MIN_TOTAL_XP);
      const { level: previousLevel } = computeLevelProgress(previousTotalXp, activeLevelsDesc);
      const { level: currentLevel } = computeLevelProgress(updatedTotalXp, activeLevelsDesc);

      if (currentLevel.id !== previousCurrentLevelId) {
        await xpRepository.setCurrentLevel(tx, userId, currentLevel.id);
      }

      return {
        awarded: true,
        amount: xpAmount,
        totalXp: updatedTotalXp,
        previousLevel,
        currentLevel,
        leveledUp: currentLevel.id !== previousLevel.id,
      };
    });
  } catch (error) {
    logger.error(`Failed to award XP for activity ${activityType}: ${describeError(error)}`);
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

export const xpService = { awardXp, getProgressForUser };
