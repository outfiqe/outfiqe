import type { NextFunction, Request, Response } from "express";

import { AppError } from "#middlewares/error-handler.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import type { PlatformPermissionKey } from "./platform-access.constants.js";
import { platformAccessService } from "./platform-access.service.js";
import type { PlatformPrincipal } from "./platform-access.types.js";

const FORBIDDEN_STATUS = 403;
const FORBIDDEN_MESSAGE = "You do not have permission to do this.";

export const requirePlatformRole = (key: PlatformPermissionKey) => {
  const enforceKey = async (_req: Request, res: Response, next: NextFunction) => {
    const principal = requireAuthPrincipal(res);
    const permissionKeys = await platformAccessService.permissionKeysFor(principal.userId);

    if (!permissionKeys.includes(key)) {
      return next(new AppError("FORBIDDEN", FORBIDDEN_MESSAGE, FORBIDDEN_STATUS));
    }

    res.locals.platform = {
      actorUserId: principal.userId,
      permissionKeys,
    } satisfies PlatformPrincipal;
    next();
  };

  return [requirePlatformAccess, enforceKey] as const;
};

export const getPlatformPrincipal = (res: Response): PlatformPrincipal => {
  const principal = res.locals.platform as PlatformPrincipal | undefined;
  if (!principal) throw new Error("reached without a resolved platform principal");
  return principal;
};
