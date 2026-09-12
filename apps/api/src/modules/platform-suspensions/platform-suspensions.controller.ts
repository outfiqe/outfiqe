import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getPlatformPrincipal } from "#modules/platform-access/platform-access.middleware.js";

import type {
  BanUserBody,
  SuspendUserBody,
  TargetBrandIdParam,
  TargetUserIdParam,
} from "./platform-suspensions.schemas.js";
import { platformSuspensionsService } from "./platform-suspensions.service.js";

export const platformSuspensionsController = {
  async suspendUser(_req: Request, res: Response) {
    const { userId } = validated.params<TargetUserIdParam>(res);
    const { reason, durationHours } = validated.body<SuspendUserBody>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    await platformSuspensionsService.suspendUser({
      targetUserId: userId,
      actorUserId,
      reason,
      durationHours,
    });
    sendSuccess(res, null, "Account suspended.");
  },

  async banUser(_req: Request, res: Response) {
    const { userId } = validated.params<TargetUserIdParam>(res);
    const { reason } = validated.body<BanUserBody>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    await platformSuspensionsService.banUser({ targetUserId: userId, actorUserId, reason });
    sendSuccess(res, null, "Account banned.");
  },

  async unsuspendUser(_req: Request, res: Response) {
    const { userId } = validated.params<TargetUserIdParam>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    await platformSuspensionsService.unsuspendUser({ targetUserId: userId, actorUserId });
    sendSuccess(res, null, "Account unsuspended.");
  },

  async unbanUser(_req: Request, res: Response) {
    const { userId } = validated.params<TargetUserIdParam>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    await platformSuspensionsService.unbanUser({ targetUserId: userId, actorUserId });
    sendSuccess(res, null, "Ban lifted.");
  },

  async suspendBrand(_req: Request, res: Response) {
    const { brandId } = validated.params<TargetBrandIdParam>(res);
    const { reason, durationHours } = validated.body<SuspendUserBody>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    await platformSuspensionsService.suspendBrand({
      targetBrandId: brandId,
      actorUserId,
      reason,
      durationHours,
    });
    sendSuccess(res, null, "Brand suspended.");
  },

  async unsuspendBrand(_req: Request, res: Response) {
    const { brandId } = validated.params<TargetBrandIdParam>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    await platformSuspensionsService.unsuspendBrand({ targetBrandId: brandId, actorUserId });
    sendSuccess(res, null, "Brand unsuspended.");
  },
};
