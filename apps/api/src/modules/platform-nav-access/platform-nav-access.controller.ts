import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { getCoFounderContext } from "./platform-nav-access.middleware.js";
import type {
  CoFounderParams,
  PromoteCoFounderBody,
  SetHiddenNavKeysBody,
} from "./platform-nav-access.schemas.js";
import { platformNavAccessService } from "./platform-nav-access.service.js";

export const platformNavAccessController = {
  async getOverview(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    sendSuccess(
      res,
      await platformNavAccessService.getOverview(userId),
      "Platform navigation access.",
    );
  },

  async listCandidates(_req: Request, res: Response) {
    const candidates = await platformNavAccessService.listCandidates(getCoFounderContext(res));
    sendSuccess(res, candidates, "Promotable platform members.");
  },

  async setHiddenNavKeys(_req: Request, res: Response) {
    const { hiddenNavKeys } = validated.body<SetHiddenNavKeysBody>(res);
    const context = getCoFounderContext(res);

    const saved = await platformNavAccessService.setHiddenNavKeys(hiddenNavKeys, context);

    await platformAudit.record({
      actorUserId: context.userId,
      action: PLATFORM_AUDIT_ACTION.NAV_ACCESS_HIDDEN_KEYS_SET,
      summary: `Set the hidden platform nav items to [${saved.join(", ") || "none"}]`,
      targetType: "platform-nav-access",
      metadata: { hiddenNavKeys: saved },
    });

    sendSuccess(res, { hiddenNavKeys: saved }, "Navigation visibility saved.");
  },

  async promoteCoFounder(_req: Request, res: Response) {
    const { membershipId } = validated.body<PromoteCoFounderBody>(res);
    const context = getCoFounderContext(res);

    const promoted = await platformNavAccessService.promoteCoFounder(membershipId, context);

    await platformAudit.record({
      actorUserId: context.userId,
      action: PLATFORM_AUDIT_ACTION.NAV_ACCESS_CO_FOUNDER_PROMOTED,
      summary: `Promoted ${promoted.email} to the co-founder group`,
      targetType: "membership",
      targetId: promoted.membershipId,
      metadata: { promotedUserId: promoted.userId },
    });

    sendSuccess(res, promoted, "Co-founder added.");
  },

  async demoteCoFounder(_req: Request, res: Response) {
    const { membershipId } = validated.params<CoFounderParams>(res);
    const context = getCoFounderContext(res);

    await platformNavAccessService.demoteCoFounder(membershipId, context);

    await platformAudit.record({
      actorUserId: context.userId,
      action: PLATFORM_AUDIT_ACTION.NAV_ACCESS_CO_FOUNDER_DEMOTED,
      summary: `Removed a member from the co-founder group`,
      targetType: "membership",
      targetId: membershipId,
    });

    sendSuccess(res, null, "Co-founder removed.");
  },
};
