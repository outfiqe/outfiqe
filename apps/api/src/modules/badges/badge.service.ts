import { prisma } from "#db/prisma.js";
import { XpActivityType } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { achievementService } from "#modules/achievements/achievement.service.js";
import { XP_SOURCE } from "#modules/xp/xp.constants.js";
import { xpService } from "#modules/xp/xp.service.js";

import { badgeRepository } from "./badge.repository.js";
import type {
  AwardBadgeBody,
  CreateBadgeBody,
  RemoveUserBadgeBody,
  UpdateBadgeBody,
} from "./badge.schemas.js";
import type {
  AwardBadgeInput,
  BadgeAdminRecord,
  BadgeAdminStats,
  BadgeCollectionEntry,
  FeaturedBadgeView,
  ManualAwardRecord,
} from "./badge.types.js";
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
      isDynamicallyActive: state && badge.isDynamic ? state.isDynamicallyEligible : null,
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

const listAllBadgesAdmin = async (): Promise<BadgeAdminRecord[]> =>
  badgeRepository.listAllBadgesAdmin();

const createBadge = async (input: CreateBadgeBody): Promise<BadgeAdminRecord> =>
  badgeRepository.createBadgeWithAchievement(input);

const updateBadge = async (badgeId: string, input: UpdateBadgeBody): Promise<BadgeAdminRecord> => {
  const existing = await badgeRepository.findBadgeAdminById(badgeId);
  if (!existing) {
    throw new AppError("BADGE_NOT_FOUND", "This badge doesn't exist.", NOT_FOUND_STATUS);
  }
  return badgeRepository.updateBadgeWithAchievement(badgeId, input);
};

const awardBadgeManually = async (
  badgeId: string,
  { userId, reason }: AwardBadgeBody,
  adminUserId: string,
) => {
  const result = await awardBadge({
    userId,
    badgeId,
    awardedById: adminUserId,
    awardReason: reason,
  });

  if (!result.awarded) {
    const messageByReason: Record<string, string> = {
      BADGE_NOT_FOUND: "This badge doesn't exist.",
      BADGE_INACTIVE: "This badge is inactive and can't be awarded.",
      ALREADY_AWARDED: "This user already has this badge.",
      ASSIGNMENT_LIMIT_REACHED: "This badge has reached its assignment limit.",
    };
    throw new AppError(
      result.reason,
      messageByReason[result.reason] ?? "Couldn't award this badge.",
      VALIDATION_STATUS,
    );
  }

  logger.info(`Badge ${badgeId} manually awarded to user ${userId} by admin ${adminUserId}`);
  return result;
};

const removeUserBadge = async (
  userBadgeId: string,
  input: RemoveUserBadgeBody,
  adminUserId: string,
): Promise<void> => {
  const removed = await badgeRepository.removeUserBadge(userBadgeId, input);
  if (!removed) {
    throw new AppError(
      "USER_BADGE_NOT_FOUND",
      "This badge award doesn't exist or was already removed.",
      NOT_FOUND_STATUS,
    );
  }
  logger.info(`UserBadge ${userBadgeId} removed by admin ${adminUserId}: ${input.reason}`);
};

const listManualAwards = async (): Promise<ManualAwardRecord[]> =>
  badgeRepository.listManualAwards();

const getAdminStats = async (): Promise<BadgeAdminStats> => {
  const [totalBadgesAwarded, totalAchievementsUnlocked, totalManualAwards, mostAwardedBadge] =
    await Promise.all([
      badgeRepository.countAwardedBadges(),
      badgeRepository.countEngineAwardedBadges(),
      badgeRepository.countManualAwardedBadges(),
      badgeRepository.findMostAwardedBadge(),
    ]);

  return { totalBadgesAwarded, totalAchievementsUnlocked, totalManualAwards, mostAwardedBadge };
};

export const badgeService = {
  listCollectionForUser,
  updateDisplay,
  updateFeatured,
  listFeaturedForUser,
  getTitleBadgeForUser,
  updateTitle,
  awardBadge,
  listAllBadgesAdmin,
  createBadge,
  updateBadge,
  awardBadgeManually,
  removeUserBadge,
  listManualAwards,
  getAdminStats,
};
