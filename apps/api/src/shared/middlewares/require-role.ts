import type { NextFunction, Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import type { UserRole } from "#generated/prisma/enums.js";
import { describeRouteHandler } from "#lib/route-docs.utils.js";

import { AppError } from "./error-handler.js";
import { getAuthPrincipal } from "./require-auth.js";

export const requireRole = (...allowedRoles: UserRole[]) => {
  const enforceRole = (_req: Request, res: Response, next: NextFunction) => {
    const principal = getAuthPrincipal(res);

    if (!principal || !allowedRoles.includes(principal.role)) {
      return next(
        new AppError("FORBIDDEN", "You do not have permission to do this.", HTTP_STATUS.FORBIDDEN),
      );
    }

    next();
  };

  return describeRouteHandler(enforceRole, { kind: "role", roles: allowedRoles });
};
