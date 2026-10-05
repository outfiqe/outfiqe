import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  AdminBuildActionBody,
  AdminBuildHistoryQuery,
  AdminBuildIdParam,
  BuildMetricsQuery,
  ListAdminBuildsQuery,
} from "./outfit-admin.schemas.js";
import { outfitAdminService } from "./outfit-admin.service.js";

export const outfitAdminController = {
  async listBuilds(_req: Request, res: Response) {
    const query = validated.query<ListAdminBuildsQuery>(res);
    sendSuccess(res, await outfitAdminService.listBuilds(query), "Builds.");
  },

  async getBuild(_req: Request, res: Response) {
    const { id } = validated.params<AdminBuildIdParam>(res);
    sendSuccess(res, await outfitAdminService.getBuild(id), "Build.");
  },

  async getBuildHistory(_req: Request, res: Response) {
    const { id } = validated.params<AdminBuildIdParam>(res);
    const { beforeVersion } = validated.query<AdminBuildHistoryQuery>(res);
    sendSuccess(res, await outfitAdminService.getBuildHistory(id, beforeVersion), "Build history.");
  },

  async unlockBuild(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<AdminBuildIdParam>(res);
    await outfitAdminService.unlockBuild(userId, id, validated.body<AdminBuildActionBody>(res));
    sendSuccess(res, null, "Build unlocked.");
  },

  async archiveBuild(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<AdminBuildIdParam>(res);
    await outfitAdminService.archiveBuild(userId, id, validated.body<AdminBuildActionBody>(res));
    sendSuccess(res, null, "Build archived.");
  },

  async getMetrics(_req: Request, res: Response) {
    const { weeks } = validated.query<BuildMetricsQuery>(res);
    sendSuccess(res, await outfitAdminService.getMetrics(weeks), "Build metrics.");
  },
};
