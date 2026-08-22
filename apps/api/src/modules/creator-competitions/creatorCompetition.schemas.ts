import { z } from "zod";

import { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";
import { badgeCoreFields } from "#modules/badges/badge.schemas.js";

import {
  MAX_COMPETITION_WINNERS,
  MIN_COMPETITION_WINNERS,
} from "./creatorCompetition.constants.js";

const NAME_MAX_LENGTH = 100;

const {
  assignmentLimit: _assignmentLimit,
  isDynamic: _isDynamic,
  sponsorBrandId: _sponsorBrandId,
  ...competitionBadgeFields
} = badgeCoreFields;

export const createCreatorCompetitionSchema = z
  .object({
    ...competitionBadgeFields,
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    leaderboardCategory: z.enum(CreatorLeaderboardCategory),
    topN: z.number().int().min(MIN_COMPETITION_WINNERS).max(MAX_COMPETITION_WINNERS),
  })
  .strict();

export const updateCreatorCompetitionSchema = z
  .object({
    ...competitionBadgeFields,
    name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
    leaderboardCategory: z.enum(CreatorLeaderboardCategory),
    topN: z.number().int().min(MIN_COMPETITION_WINNERS).max(MAX_COMPETITION_WINNERS),
    isActive: z.boolean(),
  })
  .strict();

export const creatorCompetitionIdParamSchema = z.object({
  competitionId: z.uuid(),
});

export type CreateCreatorCompetitionBody = z.infer<typeof createCreatorCompetitionSchema>;
export type UpdateCreatorCompetitionBody = z.infer<typeof updateCreatorCompetitionSchema>;
export type CreatorCompetitionIdParam = z.infer<typeof creatorCompetitionIdParamSchema>;
