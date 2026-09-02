import type { PlatformNavKey } from "@outfiqe/utils";
import type { NextFunction, Request, Response } from "express";

import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { requireAuth, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { describeError } from "#redis/redis.utils.js";

import { platformNavAccessService } from "./platform-nav-access.service.js";
import type { CoFounderContext } from "./platform-nav-access.types.js";

const FORBIDDEN_STATUS = 403;
const FORBIDDEN_MESSAGE = "You do not have permission to do this.";

const enforceCoFounder = async (_req: Request, res: Response, next: NextFunction) => {
  const { userId } = requireAuthPrincipal(res);
  const context = await platformNavAccessService.requireCoFounderContext(userId);
  if (!context) {
    return next(new AppError("FORBIDDEN", FORBIDDEN_MESSAGE, FORBIDDEN_STATUS));
  }
  res.locals.coFounder = context;
  next();
};

export const requireCoFounder = [requireAuth, requirePlatformAccess, enforceCoFounder] as const;

export const getCoFounderContext = (res: Response): CoFounderContext => {
  const context = res.locals.coFounder as CoFounderContext | undefined;
  if (!context) throw new Error("reached without a resolved co-founder context");
  return context;
};

export const requirePlatformNavItem =
  (navKey: PlatformNavKey) => async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = requireAuthPrincipal(res);
      const { isCoFounder, hiddenNavKeys } = await platformNavAccessService.resolveFor(userId);
      if (isCoFounder || !hiddenNavKeys.includes(navKey)) return next();
      return next(new AppError("FORBIDDEN", FORBIDDEN_MESSAGE, FORBIDDEN_STATUS));
    } catch (error) {
      logger.error(`platform nav-item guard failed open for ${navKey}: ${describeError(error)}`);
      return next();
    }
  };
