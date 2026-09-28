import type { NextFunction, Request, Response } from "express";

import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { requireAuth, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import type { PlatformPermissionKey } from "./platform-access.constants.js";
import { platformAccessService } from "./platform-access.service.js";
import type { PlatformAccess, PlatformPrincipal } from "./platform-access.types.js";

const FORBIDDEN_STATUS = 403;
const FORBIDDEN_MESSAGE = "You do not have permission to do this.";

const resolveRequestPlatformAccess = async (
  res: Response,
  userId: string,
): Promise<PlatformAccess> => {
  const alreadyResolved = res.locals.platformAccess as PlatformAccess | undefined;
  return alreadyResolved ?? platformAccessService.resolveAccess(userId);
};

export const requirePlatformRole = (...acceptedKeys: PlatformPermissionKey[]) => {
  const enforceKey = async (req: Request, res: Response, next: NextFunction) => {
    const principal = requireAuthPrincipal(res);
    const { permissionKeys } = await resolveRequestPlatformAccess(res, principal.userId);

    const holdsAcceptedKey = acceptedKeys.some((key) => permissionKeys.includes(key));
    if (!holdsAcceptedKey) {
      logger.warn(
        `PLATFORM_ACCESS_DENIED user=${principal.userId} needs=${acceptedKeys.join("|")} ${req.method} ${req.originalUrl}`,
      );
      return next(new AppError("FORBIDDEN", FORBIDDEN_MESSAGE, FORBIDDEN_STATUS));
    }

    res.locals.platform = {
      actorUserId: principal.userId,
      permissionKeys,
    } satisfies PlatformPrincipal;
    next();
  };

  return [requireAuth, requirePlatformAccess, enforceKey] as const;
};

export const getPlatformPrincipal = (res: Response): PlatformPrincipal => {
  const principal = res.locals.platform as PlatformPrincipal | undefined;
  if (!principal) throw new Error("reached without a resolved platform principal");
  return principal;
};
