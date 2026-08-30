import type { Request, Response } from "express";

import { getAuthPrincipal } from "#middlewares/require-auth.js";
import type { MembershipWithRole } from "#modules/crm-access/crm-access.types.js";

import type { AuditActor } from "./crm-audit.types.js";

export const buildAuditActor = (req: Request, res: Response): AuditActor => {
  const membership = res.locals.crmMembership as MembershipWithRole | undefined;
  return {
    actorUserId: getAuthPrincipal(res)?.userId ?? null,
    actorMembershipId: membership?.id ?? null,
    ipAddress: req.ip ?? null,
  };
};
