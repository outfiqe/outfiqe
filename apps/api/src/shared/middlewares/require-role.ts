import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "#generated/prisma/enums.js";

import { AppError } from "./error-handler.js";
import { getAuthPrincipal } from "./require-auth.js";

const FORBIDDEN_STATUS = 403;

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    const principal = getAuthPrincipal(res);

    if (!principal || !allowedRoles.includes(principal.role)) {
      return next(
        new AppError("FORBIDDEN", "You do not have permission to do this.", FORBIDDEN_STATUS),
      );
    }

    next();
  };
};
