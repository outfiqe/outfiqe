import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { validated } from "#middlewares/validate.js";
import { getPlatformPrincipal } from "#modules/platform-access/platform-access.middleware.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { platformFeaturesRepository } from "./platform-features.repository.js";
import type {
  FeatureKeyParams,
  OrgIdParams,
  SetOverrideBody,
} from "./platform-features.schemas.js";
import { platformFeaturesService } from "./platform-features.service.js";

const NOT_FOUND_STATUS = 404;

const requireOrganization = async (organizationId: string): Promise<void> => {
  const plan = await platformFeaturesRepository.findOrganizationPlan(organizationId);
  if (plan === null) {
    throw new AppError("ORGANIZATION_NOT_FOUND", "Organization not found.", NOT_FOUND_STATUS);
  }
};

export const platformFeaturesController = {
  getRegistry(_req: Request, res: Response) {
    sendSuccess(res, platformFeaturesService.registry(), "Feature registry.");
  },

  async getTenantFeatures(_req: Request, res: Response) {
    const { orgId } = validated.params<OrgIdParams>(res);
    await requireOrganization(orgId);
    sendSuccess(res, await platformFeaturesService.resolveAll(orgId), "Resolved features.");
  },

  async setOverride(_req: Request, res: Response) {
    const { orgId, key } = validated.params<FeatureKeyParams>(res);
    const body = validated.body<SetOverrideBody>(res);
    await requireOrganization(orgId);

    const override = await platformFeaturesRepository.upsertOverride({
      organizationId: orgId,
      key,
      enabled: body.enabled,
      metadata: body.metadata,
      note: body.note ?? null,
      setByUserId: getPlatformPrincipal(res).actorUserId,
    });
    platformFeaturesService.invalidate(orgId, key);

    await platformAudit.record({
      actorUserId: getPlatformPrincipal(res).actorUserId,
      action: PLATFORM_AUDIT_ACTION.FEATURE_OVERRIDE_SET,
      summary: `Set ${key}=${body.enabled} for organization ${orgId}`,
      organizationId: orgId,
      targetType: "feature",
      targetId: key,
      metadata: { key, enabled: body.enabled, note: body.note ?? null },
    });

    sendSuccess(res, override, "Feature override saved.");
  },

  async clearOverride(_req: Request, res: Response) {
    const { orgId, key } = validated.params<FeatureKeyParams>(res);
    await requireOrganization(orgId);

    const removed = await platformFeaturesRepository.deleteOverride(orgId, key);
    platformFeaturesService.invalidate(orgId, key);

    if (removed) {
      await platformAudit.record({
        actorUserId: getPlatformPrincipal(res).actorUserId,
        action: PLATFORM_AUDIT_ACTION.FEATURE_OVERRIDE_CLEARED,
        summary: `Cleared the ${key} override for organization ${orgId}`,
        organizationId: orgId,
        targetType: "feature",
        targetId: key,
        metadata: { key },
      });
    }

    sendSuccess(res, null, "Feature override cleared.");
  },
};
