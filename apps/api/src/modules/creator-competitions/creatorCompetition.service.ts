import { previousIsoWeekKey } from "#lib/iso-week.utils.js";
import logger from "#lib/winston.utils.js";
import { badgeService } from "#modules/badges/badge.service.js";
import { creatorLeaderboardRepository } from "#modules/creator-leaderboard/creatorLeaderboard.repository.js";
import { describeError } from "#redis/redis.utils.js";

import { COMPETITION_XP_SOURCE } from "./creatorCompetition.constants.js";
import {
  type CreatorCompetitionRecordWithBadge,
  creatorCompetitionRepository,
} from "./creatorCompetition.repository.js";
import type {
  CreateCreatorCompetitionBody,
  UpdateCreatorCompetitionBody,
} from "./creatorCompetition.schemas.js";
import type {
  CreatorCompetitionAdminRecord,
  PublicCreatorCompetitionView,
} from "./creatorCompetition.types.js";
import { toPublicView } from "./creatorCompetition.utils.js";

const TOP_RANK_POSITION_OFFSET = 1;

const settleOneCompetition = async (
  competition: CreatorCompetitionRecordWithBadge,
  week: string,
): Promise<void> => {
  const isEnabled = await creatorLeaderboardRepository.isCategoryEnabled(competition.category);
  if (!isEnabled) {
    logger.info(
      `Skipping settlement for competition ${competition.id}: ${competition.category} is disabled.`,
    );
    return;
  }

  const winners = await creatorLeaderboardRepository.topN(
    competition.category,
    week,
    competition.topN,
  );

  for (const [index, winner] of winners.entries()) {
    const result = await badgeService.awardBadge(
      { userId: winner.member, badgeId: competition.badge.id },
      COMPETITION_XP_SOURCE,
    );
    if (!result.awarded) {
      logger.info(
        `Competition ${competition.id} rank ${index + TOP_RANK_POSITION_OFFSET} winner ` +
          `${winner.member} was skipped: ${result.reason}`,
      );
    }
  }
};

const settleWeeklyCompetitions = async (now: Date): Promise<void> => {
  const week = previousIsoWeekKey(now);
  const activeCompetitions = await creatorCompetitionRepository.listActive();

  for (const competition of activeCompetitions) {
    try {
      await settleOneCompetition(competition, week);
    } catch (error) {
      logger.error(
        `Failed to settle creator competition ${competition.id} for week ${week}: ${describeError(error)}`,
      );
    }
  }
};

const runWeeklySettlement = async (): Promise<void> => {
  await settleWeeklyCompetitions(new Date());
};

const listActiveForViewers = async (): Promise<PublicCreatorCompetitionView[]> => {
  const competitions = await creatorCompetitionRepository.listActive();
  return competitions.map(toPublicView);
};

const listAllAdmin = (): Promise<CreatorCompetitionAdminRecord[]> =>
  creatorCompetitionRepository.listAllAdmin();

const createCompetition = (
  input: CreateCreatorCompetitionBody,
): Promise<CreatorCompetitionAdminRecord> => creatorCompetitionRepository.createWithBadge(input);

const updateCompetition = (
  competitionId: string,
  input: UpdateCreatorCompetitionBody,
): Promise<CreatorCompetitionAdminRecord> =>
  creatorCompetitionRepository.updateWithBadge(competitionId, input);

export const creatorCompetitionService = {
  settleWeeklyCompetitions,
  runWeeklySettlement,
  listActiveForViewers,
  listAllAdmin,
  createCompetition,
  updateCompetition,
};
