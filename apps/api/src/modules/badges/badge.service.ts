import { prisma } from "#db/prisma.js";
import { XpActivityType } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { achievementService } from "#modules/achievements/achievement.service.js";
import { XP_SOURCE } from "#modules/xp/xp.constants.js";
import { xpService } from "#modules/xp/xp.service.js";

import { badgeRepository } from "./badge.repository.js";
import type { AwardBadgeInput, BadgeCollectionEntry, FeaturedBadgeView } from "./badge.types.js";
import { parseDesignConfig } from "./badge.utils.js";

const NOT_FOUND_STATUS = 404;
const VALIDATION_STATUS = 422;

const listCollectionForUser = async (userId: string): Promise<BadgeCollectionEntry[]> => {
  const [badges, userStates, progressList] = await Promise.all([
    badgeRepository.listActiveBadges(),
    badgeRepository.listUserBadgeStates(userId),
    achievementService.listProgressForUser(userId),
  ]);

  const stateByBadgeId = new Map(userStates.map((state) => [state.badgeId, state]));
  const progressByBadgeId = new Map(progressList.map((entry) => [entry.badgeId, entry.conditions]));

  const collection: BadgeCollectionEntry[] = [];
  for (const badge of badges) {
    const state = stateByBadgeId.get(badge.id);
    if (!state && !badge.isPublic) continue;

    const designConfig = parseDesignConfig(badge.designConfig);
    if (!designConfig) {
      logger.error(
        `Badge ${badge.id} has an invalid designConfig — excluded from the collection view.`,
      );
      continue;
    }

    collection.push({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      category: badge.category,
      rarity: badge.rarity,
      icon: badge.icon,
      designConfig,
      isPermanent: badge.isPermanent,
      isCollected: Boolean(state),
      unlockedAt: state ? state.unlockedAt.toISOString() : null,
      isDisplayed: state?.isDisplayed ?? null,
      isFeatured: state?.isFeatured ?? null,
      displayOrder: state?.displayOrder ?? null,
      progress: state ? null : (progressByBadgeId.get(badge.id) ?? null),
    });
  }
  return collection;
};

const updateDisplay = async (
  userId: string,
  badgeId: string,
  isDisplayed: boolean,
): Promise<void> => {
  const updated = await badgeRepository.updateDisplay(userId, badgeId, isDisplayed);
  if (!updated) {
    throw new AppError(
      "BADGE_NOT_COLLECTED",
      "You haven't collected this badge.",
      NOT_FOUND_STATUS,
    );
  }
};

const updateFeatured = async (userId: string, badgeIds: string[]): Promise<void> => {
  const ownedBadgeIds = await badgeRepository.findOwnedBadgeIds(userId, badgeIds);
  const unownedBadgeId = badgeIds.find((badgeId) => !ownedBadgeIds.has(badgeId));
  if (unownedBadgeId) {
    throw new AppError(
      "BADGE_NOT_COLLECTED",
      "You can only feature badges you've collected.",
      VALIDATION_STATUS,
    );
  }

  await prisma.$transaction(async (tx) => {
    await badgeRepository.clearFeatured(tx, userId);
    for (const [displayOrder, badgeId] of badgeIds.entries()) {
      await badgeRepository.setFeatured(tx, userId, badgeId, displayOrder);
    }
  });
};

const listFeaturedForUser = async (userId: string): Promise<FeaturedBadgeView[]> => {
  const rows = await badgeRepository.listFeaturedForUser(userId);

  const featured: FeaturedBadgeView[] = [];
  for (const row of rows) {
    const designConfig = parseDesignConfig(row.designConfig);
    if (!designConfig) {
      logger.error(
        `Badge ${row.id} has an invalid designConfig — excluded from the featured view.`,
      );
      continue;
    }
    featured.push({ id: row.id, name: row.name, icon: row.icon, designConfig, rarity: row.rarity });
  }
  return featured;
};

const awardBadge = async (input: AwardBadgeInput) => {
  const result = await badgeRepository.awardBadge(input);
  if (!result.awarded) return result;

  if (result.xpReward > 0) {
    await xpService.grantFixedXp(
      {
        userId: input.userId,
        activityType: XpActivityType.ACHIEVEMENT_UNLOCKED,
        relatedEntityId: input.badgeId,
        source: XP_SOURCE.ADMIN,
        metadata: { badgeId: input.badgeId, awardedById: input.awardedById },
      },
      result.xpReward,
    );
  }

  return result;
};

const getTitleBadgeForUser = async (userId: string): Promise<FeaturedBadgeView | null> => {
  const row = await badgeRepository.findTitleForUser(userId);
  if (!row) return null;

  const designConfig = parseDesignConfig(row.designConfig);
  if (!designConfig) {
    logger.error(`Badge ${row.id} has an invalid designConfig — excluded from the title view.`);
    return null;
  }
  return { id: row.id, name: row.name, icon: row.icon, designConfig, rarity: row.rarity };
};

const updateTitle = async (userId: string, badgeId: string | null): Promise<void> => {
  if (badgeId !== null) {
    const eligibleBadgeId = await badgeRepository.findOwnedTitleEligibleBadgeId(userId, badgeId);
    if (!eligibleBadgeId) {
      throw new AppError(
        "BADGE_NOT_TITLE_ELIGIBLE",
        "This badge can't be set as your title.",
        VALIDATION_STATUS,
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await badgeRepository.clearTitle(tx, userId);
    if (badgeId !== null) await badgeRepository.setTitle(tx, userId, badgeId);
  });
};

export const badgeService = {
  listCollectionForUser,
  updateDisplay,
  updateFeatured,
  listFeaturedForUser,
  getTitleBadgeForUser,
  updateTitle,
  awardBadge,
};
