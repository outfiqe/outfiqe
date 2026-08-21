import { AppError } from "#middlewares/error-handler.js";
import { achievementService } from "#modules/achievements/achievement.service.js";
import { badgeRepository } from "#modules/badges/badge.repository.js";

import {
  type ChallengeRecordWithAchievementAndBadge,
  challengeRepository,
} from "./challenge.repository.js";
import type { CreateChallengeBody, UpdateChallengeBody } from "./challenge.schemas.js";
import type { ChallengeAdminRecord, PublicChallengeView } from "./challenge.types.js";
import { computeChallengeStatus } from "./challenge.utils.js";

const NOT_FOUND_STATUS = 404;

const toPublicView = (
  challenge: ChallengeRecordWithAchievementAndBadge,
  completedBadgeIds: Set<string>,
  progressByAchievementId: Map<string, PublicChallengeView["conditions"]>,
  viewerId: string | undefined,
): PublicChallengeView => {
  const { achievement } = challenge;
  const { badge } = achievement;

  return {
    id: challenge.id,
    name: challenge.name,
    description: challenge.description,
    bannerImageUrl: challenge.bannerImageUrl,
    status: computeChallengeStatus(achievement.activeFrom, achievement.activeUntil, new Date()),
    activeFrom: achievement.activeFrom,
    activeUntil: achievement.activeUntil,
    badge: {
      id: badge.id,
      name: badge.name,
      icon: badge.icon,
      category: badge.category,
      rarity: badge.rarity,
      xpReward: badge.xpReward,
      designConfig: badge.designConfig,
    },
    isCompleted: viewerId ? completedBadgeIds.has(badge.id) : null,
    conditions: progressByAchievementId.get(achievement.id) ?? null,
  };
};

type ViewerContext = {
  completedBadgeIds: Set<string>;
  progressByAchievementId: Map<string, PublicChallengeView["conditions"]>;
};

const loadViewerContext = async (
  challenges: ChallengeRecordWithAchievementAndBadge[],
  viewerId: string | undefined,
): Promise<ViewerContext> => {
  if (!viewerId) return { completedBadgeIds: new Set(), progressByAchievementId: new Map() };

  const badgeIds = challenges.map((challenge) => challenge.achievement.badge.id);
  const [completedBadgeIds, progress] = await Promise.all([
    badgeRepository.findOwnedBadgeIds(viewerId, badgeIds),
    achievementService.listProgressForUser(viewerId),
  ]);

  const progressByAchievementId = new Map(
    progress.map((entry) => [entry.achievementId, entry.conditions]),
  );
  return { completedBadgeIds, progressByAchievementId };
};

const listActiveChallengesForViewer = async (
  viewerId: string | undefined,
): Promise<PublicChallengeView[]> => {
  const challenges = await challengeRepository.listActiveChallenges();
  const { completedBadgeIds, progressByAchievementId } = await loadViewerContext(
    challenges,
    viewerId,
  );

  return challenges.map((challenge) =>
    toPublicView(challenge, completedBadgeIds, progressByAchievementId, viewerId),
  );
};

const findActiveChallengeForViewer = async (
  challengeId: string,
  viewerId: string | undefined,
): Promise<PublicChallengeView> => {
  const challenge = await challengeRepository.findActiveChallengeById(challengeId);
  if (!challenge) {
    throw new AppError("CHALLENGE_NOT_FOUND", "Challenge not found.", NOT_FOUND_STATUS);
  }

  const { completedBadgeIds, progressByAchievementId } = await loadViewerContext(
    [challenge],
    viewerId,
  );
  return toPublicView(challenge, completedBadgeIds, progressByAchievementId, viewerId);
};

const listAllChallengesAdmin = (): Promise<ChallengeAdminRecord[]> =>
  challengeRepository.listAllChallengesAdmin();

const createChallenge = (input: CreateChallengeBody): Promise<ChallengeAdminRecord> =>
  challengeRepository.createChallengeWithAchievementAndBadge(input);

const updateChallenge = (
  challengeId: string,
  input: UpdateChallengeBody,
): Promise<ChallengeAdminRecord> =>
  challengeRepository.updateChallengeWithAchievementAndBadge(challengeId, input);

export const challengeService = {
  listActiveChallengesForViewer,
  findActiveChallengeForViewer,
  listAllChallengesAdmin,
  createChallenge,
  updateChallenge,
};
