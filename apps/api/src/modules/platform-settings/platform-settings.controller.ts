import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getPlatformPrincipal } from "#modules/platform-access/platform-access.middleware.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import type { SettingKeyParams, UpdateSettingBody } from "./platform-settings.schemas.js";
import { platformSettingsService } from "./platform-settings.service.js";
import type { PlatformSettingChange } from "./platform-settings.types.js";

const SETTING_AUDIT_TARGET_TYPE = "platform-setting";

const recordSettingAudit = (
  actorUserId: string,
  action: string,
  { key, before, after }: PlatformSettingChange,
) =>
  platformAudit.record({
    actorUserId,
    action,
    summary: `Changed ${key} from ${before} to ${after}`,
    targetType: SETTING_AUDIT_TARGET_TYPE,
    targetId: key,
    metadata: { key, before, after },
  });

export const platformSettingsController = {
  async list(_req: Request, res: Response) {
    sendSuccess(res, await platformSettingsService.list(), "Platform settings.");
  },

  async update(_req: Request, res: Response) {
    const { key } = validated.params<SettingKeyParams>(res);
    const { value } = validated.body<UpdateSettingBody>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    const change = await platformSettingsService.update(key, value, actorUserId);
    await recordSettingAudit(actorUserId, PLATFORM_AUDIT_ACTION.PLATFORM_SETTING_UPDATED, change);

    sendSuccess(res, change, "Setting saved.");
  },

  async reset(_req: Request, res: Response) {
    const { key } = validated.params<SettingKeyParams>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    const change = await platformSettingsService.reset(key, actorUserId);
    await recordSettingAudit(actorUserId, PLATFORM_AUDIT_ACTION.PLATFORM_SETTING_RESET, change);

    sendSuccess(res, change, "Setting reset to its default.");
  },
};
