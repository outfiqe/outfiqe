import { prisma } from "#db/prisma.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { achievementService } from "#modules/achievements/achievement.service.js";

import { badgeRepository } from "./badge.repository.js";
import type { BadgeCollectionEntry, FeaturedBadgeView } from "./badge.types.js";
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

export const badgeService = {
  listCollectionForUser,
  updateDisplay,
  updateFeatured,
  listFeaturedForUser,
};
