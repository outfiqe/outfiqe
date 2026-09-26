import { NotificationFeedScope } from "@outfiqe/types";
import type { NextFunction, Request, Response } from "express";

import { validated } from "#middlewares/validate.js";
import { resolveTenant } from "#modules/crm-access/crm-access.middleware.js";

import type { NotificationScopeQuery } from "./notification.schemas.js";

export const resolveTenantForTenantScope = (req: Request, res: Response, next: NextFunction) => {
  const { scope } = validated.query<NotificationScopeQuery>(res);
  if (scope !== NotificationFeedScope.TENANT) return next();
  return resolveTenant(req, res, next);
};
