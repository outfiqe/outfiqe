import type { NextFunction, Request, Response } from "express";

import { AppError } from "./error-handler.js";
import { requireAuthPrincipal } from "./require-auth.js";

const FORBIDDEN_STATUS = 403;

export const denyDuringImpersonation = (_req: Request, res: Response, next: NextFunction) => {
  const { impersonation } = requireAuthPrincipal(res);
  if (impersonation && impersonation.scope !== "write") {
    return next(
      new AppError(
        "IMPERSONATION_READ_ONLY",
        "This action isn't allowed during a read-only impersonation session.",
        FORBIDDEN_STATUS,
      ),
    );
  }
  next();
};
