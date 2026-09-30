import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import { getPlatformPrincipal } from "#modules/platform-access/platform-access.middleware.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import type { FeatureFlagKeyParams, UpdateFeatureFlagBody } from "./feature-flags.schemas.js";
import { featureFlagsService } from "./feature-flags.service.js";

const FEATURE_FLAG_AUDIT_TARGET_TYPE = "feature-flag";

export const featureFlagsController = {
  async list(_req: Request, res: Response) {
    sendSuccess(res, await featureFlagsService.list(), "Feature flags.");
  },

  async listMine(_req: Request, res: Response) {
    const enabledKeys = await featureFlagsService.listEnabledKeysForUser(
      getAuthPrincipal(res)?.userId ?? null,
    );
    sendSuccess(res, { enabledKeys }, "Features on for you.");
  },

  async update(_req: Request, res: Response) {
    const { key } = validated.params<FeatureFlagKeyParams>(res);
    const requestedSettings = validated.body<UpdateFeatureFlagBody>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    const change = await featureFlagsService.update(key, requestedSettings, actorUserId);
    const { before, after } = change;

    await platformAudit.record({
      actorUserId,
      action: PLATFORM_AUDIT_ACTION.FEATURE_FLAG_UPDATED,
      summary: `Set ${key} rollout from ${before.rollout} to ${after.rollout}`,
      targetType: FEATURE_FLAG_AUDIT_TARGET_TYPE,
      targetId: key,
      metadata: { key, before, after },
    });

    sendSuccess(res, change, "Feature flag saved.");
  },
};
