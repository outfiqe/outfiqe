import type { NextFunction, Request, Response } from "express";

import { env } from "#config/env.config.js";
import { UserRole } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";

import { crmAccessRepository } from "./crm-access.repository.js";
import { crmAccessService } from "./crm-access.service.js";
import type { MembershipWithRole, OrganizationRecord } from "./crm-access.types.js";
import { extractSubdomain } from "./crm-access.utils.js";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;
const FORBIDDEN_MESSAGE = "You do not have permission to do this.";

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  const subdomain = extractSubdomain(req.hostname, env.TENANT_BASE_DOMAIN);

  const organization = subdomain
    ? await crmAccessRepository.findOrganizationBySubdomain(subdomain)
    : await crmAccessRepository.findDefaultOrganization();

  if (!organization) {
    return next(
      new AppError(
        "ORGANIZATION_NOT_FOUND",
        "No CRM organization is configured.",
        NOT_FOUND_STATUS,
      ),
    );
  }

  res.locals.crmOrganization = organization;
  next();
};

export const getResolvedOrganization = (res: Response): OrganizationRecord => {
  const organization = res.locals.crmOrganization as OrganizationRecord | undefined;
  if (!organization) throw new Error("reached without a resolved CRM organization");
  return organization;
};

export const requirePermission = (permissionKey: string) => {
  return async (_req: Request, res: Response, next: NextFunction) => {
    const principal = requireAuthPrincipal(res);
    const organization = getResolvedOrganization(res);

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

export const requirePlatformAccess = async (_req: Request, res: Response, next: NextFunction) => {
  const principal = requireAuthPrincipal(res);
  if (principal.role !== UserRole.ADMIN) {
    return next(new AppError("FORBIDDEN", FORBIDDEN_MESSAGE, FORBIDDEN_STATUS));
  }

  const hasPlatformAccess = await crmAccessService.resolveHasPlatformAccess(principal.userId);
  if (!hasPlatformAccess) {
    return next(new AppError("FORBIDDEN", FORBIDDEN_MESSAGE, FORBIDDEN_STATUS));
  }

  next();
};

export const getCrmMembership = (res: Response): MembershipWithRole => {
  const membership = res.locals.crmMembership as MembershipWithRole | undefined;
  if (!membership) throw new Error("reached without a resolved CRM membership");
  return membership;
};
