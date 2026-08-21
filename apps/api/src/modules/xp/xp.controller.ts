import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ActivityTypeParam,
  AdjustXpBody,
  CreateLevelBody,
  LevelIdParam,
  ListXpTransactionsQuery,
  UpdateActivityXpConfigBody,
  UpdateLevelBody,
} from "./xp.schemas.js";
import { xpService } from "./xp.service.js";

const NEWCOMER_PROGRESS_MESSAGE = "You haven't earned any XP yet.";
const CREATED_STATUS = 201;

export const xpController = {
  async getMyProgress(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const progress = await xpService.getProgressForUser(userId);
    sendSuccess(res, progress, progress ? "Your progress." : NEWCOMER_PROGRESS_MESSAGE);
  },

  async listMyTransactions(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListXpTransactionsQuery>(res);

    const page = await xpService.listTransactionsForUser(userId, query);
    sendSuccess(res, page, "Your XP history.");
  },

  async listLevels(_req: Request, res: Response) {
    const levels = await xpService.listLevels();
    sendSuccess(res, levels, "Levels.");
  },

  async createLevel(_req: Request, res: Response) {
    const body = validated.body<CreateLevelBody>(res);
    const level = await xpService.createLevel(body);
    sendSuccess(res, level, "Level created.", CREATED_STATUS);
  },

  async updateLevel(_req: Request, res: Response) {
    const { id } = validated.params<LevelIdParam>(res);
    const body = validated.body<UpdateLevelBody>(res);
    const level = await xpService.updateLevel(id, body);
    sendSuccess(res, level, "Level updated.");
  },

  async listActivityConfigs(_req: Request, res: Response) {
    const configs = await xpService.listActivityConfigs();
    sendSuccess(res, configs, "Activity XP config.");
  },

  async updateActivityConfig(_req: Request, res: Response) {
    const { activityType } = validated.params<ActivityTypeParam>(res);
    const body = validated.body<UpdateActivityXpConfigBody>(res);
    const config = await xpService.updateActivityConfig(activityType, body);
    sendSuccess(res, config, "Activity XP config updated.");
  },

  async adjustXp(_req: Request, res: Response) {
    const { userId: adminUserId } = requireAuthPrincipal(res);
    const body = validated.body<AdjustXpBody>(res);
    const result = await xpService.adjustXp(body, adminUserId);
    sendSuccess(res, result, "XP adjusted.");
  },

  async getAdminStats(_req: Request, res: Response) {
    const stats = await xpService.getAdminStats();
    sendSuccess(res, stats, "XP stats.");
  },
};
