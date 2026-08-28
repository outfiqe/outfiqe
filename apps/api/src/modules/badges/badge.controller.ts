import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  AwardBadgeBody,
  BadgeIdParam,
  CreateBadgeBody,
  RemoveUserBadgeBody,
  UpdateBadgeBody,
  UpdateBadgeDisplayBody,
  UpdateFeaturedBadgesBody,
  UpdateTitleBadgeBody,
  UserBadgeIdParam,
} from "./badge.schemas.js";
import { badgeService } from "./badge.service.js";

const CREATED_STATUS = 201;
const NO_FILE_STATUS = 422;

export const badgeController = {
  async listMyCollection(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const collection = await badgeService.listCollectionForUser(userId);
    sendSuccess(res, collection, "Your badge collection.");
  },

  async updateDisplay(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { badgeId } = validated.params<BadgeIdParam>(res);
    const { isDisplayed } = validated.body<UpdateBadgeDisplayBody>(res);

    await badgeService.updateDisplay(userId, badgeId, isDisplayed);
    sendSuccess(res, null, "Badge visibility updated.");
  },

  async updateFeatured(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { badgeIds } = validated.body<UpdateFeaturedBadgesBody>(res);

    await badgeService.updateFeatured(userId, badgeIds);
    sendSuccess(res, null, "Featured badges updated.");
  },

  async updateTitle(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { badgeId } = validated.body<UpdateTitleBadgeBody>(res);

    await badgeService.updateTitle(userId, badgeId);
    sendSuccess(res, null, "Title badge updated.");
  },

  async listAllAdmin(_req: Request, res: Response) {
    const badges = await badgeService.listAllBadgesAdmin();
    sendSuccess(res, badges, "Badges.");
  },

  async getAdminById(_req: Request, res: Response) {
    const { badgeId } = validated.params<BadgeIdParam>(res);
    const badge = await badgeService.findBadgeAdmin(badgeId);
    sendSuccess(res, badge, "Badge.");
  },

  async uploadIconImage(req: Request, res: Response) {
    if (!req.file) {
      throw new AppError("NO_FILE", "Attach an image file.", NO_FILE_STATUS);
    }
    const { url } = await badgeService.processIconImage(req.file.buffer);
    sendSuccess(res, { url }, "Badge icon uploaded.", CREATED_STATUS);
  },

  async create(_req: Request, res: Response) {
    const body = validated.body<CreateBadgeBody>(res);
    const badge = await badgeService.createBadge(body);
    sendSuccess(res, badge, "Badge created.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { badgeId } = validated.params<BadgeIdParam>(res);
    const body = validated.body<UpdateBadgeBody>(res);
    const badge = await badgeService.updateBadge(badgeId, body);
    sendSuccess(res, badge, "Badge updated.");
  },

  async award(_req: Request, res: Response) {
    const { badgeId } = validated.params<BadgeIdParam>(res);
    const body = validated.body<AwardBadgeBody>(res);
    const { userId: adminUserId } = requireAuthPrincipal(res);

    const result = await badgeService.awardBadgeManually(badgeId, body, adminUserId);
    sendSuccess(res, result, "Badge awarded.", CREATED_STATUS);
  },

  async removeUserBadge(_req: Request, res: Response) {
    const { userBadgeId } = validated.params<UserBadgeIdParam>(res);
    const body = validated.body<RemoveUserBadgeBody>(res);
    const { userId: adminUserId } = requireAuthPrincipal(res);

    await badgeService.removeUserBadge(userBadgeId, body, adminUserId);
    sendSuccess(res, null, "Badge removed.");
  },

  async getAdminStats(_req: Request, res: Response) {
    const stats = await badgeService.getAdminStats();
    sendSuccess(res, stats, "Badge stats.");
  },

  async listManualAwards(_req: Request, res: Response) {
    const awards = await badgeService.listManualAwards();
    sendSuccess(res, awards, "Manually awarded badges.");
  },
};
