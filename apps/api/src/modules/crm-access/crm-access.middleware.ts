import type { NextFunction, Request, Response } from "express";

import { AppError } from "#middlewares/error-handler.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";

import { crmAccessRepository } from "./crm-access.repository.js";
import type { MembershipWithRole } from "./crm-access.types.js";

const FORBIDDEN_STATUS = 403;
const FORBIDDEN_MESSAGE = "You do not have permission to do this.";

export const requirePermission = (permissionKey: string) => {
  return async (_req: Request, res: Response, next: NextFunction) => {
    const principal = requireAuthPrincipal(res);

    const organization = await crmAccessRepository.getOrganization();
    if (!organization) {
      return next(new AppError("FORBIDDEN", FORBIDDEN_MESSAGE, FORBIDDEN_STATUS));
    }

    const membership = await crmAccessRepository.findMembershipByUserAndOrg(
      principal.userId,
      organization.id,
    );

    if (!membership || membership.status !== "ACTIVE") {
      return next(new AppError("FORBIDDEN", FORBIDDEN_MESSAGE, FORBIDDEN_STATUS));
    }

    const isSuperAdmin = organization.superAdminMembershipId === membership.id;
    if (!isSuperAdmin && !membership.role.permissionKeys.includes(permissionKey)) {
      return next(new AppError("FORBIDDEN", FORBIDDEN_MESSAGE, FORBIDDEN_STATUS));
    }

    res.locals.crmMembership = membership;
    next();
  };
};

export const getCrmMembership = (res: Response): MembershipWithRole => {
  const membership = res.locals.crmMembership as MembershipWithRole | undefined;
  if (!membership) throw new Error("reached without a resolved CRM membership");
  return membership;
};
