import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getPlatformPrincipal } from "#modules/platform-access/platform-access.middleware.js";

import type {
  CandidatesQuery,
  HistoryQuery,
  SessionIdParams,
  StartImpersonationBody,
} from "./platform-impersonation.schemas.js";
import { platformImpersonationService } from "./platform-impersonation.service.js";

const CREATED_STATUS = 201;
const MANAGE_ANY_KEY = "platform:impersonate:manage";

export const platformImpersonationController = {
  async start(req: Request, res: Response) {
    const body = validated.body<StartImpersonationBody>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    const result = await platformImpersonationService.start({
      organizationId: body.organizationId,
      targetUserId: body.targetUserId,
      reason: body.reason,
      scope: body.scope,
      ttlMinutes: body.ttlMinutes,
      impersonatorId: actorUserId,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });

    sendSuccess(res, result, "Impersonation session started.", CREATED_STATUS);
  },

  async listActive(_req: Request, res: Response) {
    sendSuccess(res, await platformImpersonationService.listActive(), "Active impersonations.");
  },

  async candidates(_req: Request, res: Response) {
    const { organizationId } = validated.query<CandidatesQuery>(res);
    sendSuccess(
      res,
      await platformImpersonationService.listCandidates(organizationId),
      "Impersonation candidates.",
    );
  },

  async revoke(_req: Request, res: Response) {
    const { sessionId } = validated.params<SessionIdParams>(res);
    const { actorUserId, permissionKeys } = getPlatformPrincipal(res);
    await platformImpersonationService.revoke(
      sessionId,
      actorUserId,
      permissionKeys.includes(MANAGE_ANY_KEY),
    );
    sendSuccess(res, null, "Impersonation session revoked.");
  },

  async history(_req: Request, res: Response) {
    const { organizationId, impersonatorId, limit } = validated.query<HistoryQuery>(res);
    sendSuccess(
      res,
      await platformImpersonationService.listHistory({ organizationId, impersonatorId, limit }),
      "Impersonation history.",
    );
  },
};
