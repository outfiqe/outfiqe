import { addDays } from "date-fns/addDays";

import { TENANT_ORGANIZATION_SCOPE } from "#constants/organization.constants.js";
import { prisma } from "#db/prisma.js";
import { DEFAULT_PIPELINE_STAGES } from "#modules/crm-pipeline/crm-pipeline.constants.js";

import {
  BUILT_IN_ROLE_NAME,
  BUILT_IN_ROLE_PERMISSIONS,
  CRM_TRIAL_LENGTH_DAYS,
} from "../crm-access.constants.js";
import type {
  CreateOrganizationParams,
  MembershipRecord,
  OrganizationListItem,
  OrganizationRecord,
} from "../crm-access.types.js";

export const crmOrganizationRepository = {
  async listOrganizations(params: {
    cursor?: string;
    limit: number;
  }): Promise<OrganizationListItem[]> {
    const organizations = await prisma.organization.findMany({
      where: TENANT_ORGANIZATION_SCOPE,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { linkedBrand: { select: { name: true } } },
    });
    return organizations.map(({ linkedBrand, ...organization }) => ({
      ...organization,
      linkedBrandName: linkedBrand?.name ?? null,
    }));
  },

  async findPlatformOrganization(): Promise<OrganizationRecord | null> {
    return prisma.organization.findFirst({ where: { isPlatformOrg: true } });
  },

  async findOrganizationByLinkedBrandId(brandId: string): Promise<OrganizationRecord | null> {
    return prisma.organization.findUnique({ where: { linkedBrandId: brandId } });
  },

  async findOrganizationBySubdomain(subdomain: string): Promise<OrganizationRecord | null> {
    return prisma.organization.findUnique({ where: { subdomain } });
  },

  async findOrganizationById(organizationId: string): Promise<OrganizationRecord | null> {
    return prisma.organization.findUnique({ where: { id: organizationId } });
  },

  async createOrganization(
    input: CreateOrganizationParams,
  ): Promise<{ organization: OrganizationRecord; membership: MembershipRecord }> {
    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.name,
          subdomain: input.subdomain,
          linkedBrandId: input.linkedBrandId ?? null,
          trialEndsAt: addDays(new Date(), CRM_TRIAL_LENGTH_DAYS),
        },
      });

      let adminRoleId: string | undefined;
      for (const [roleName, permissionKeys] of Object.entries(BUILT_IN_ROLE_PERMISSIONS)) {
        const role = await tx.role.create({
          data: {
            organizationId: organization.id,
            name: roleName,
            isBuiltIn: true,
            permissions: { create: permissionKeys.map((permissionKey) => ({ permissionKey })) },
          },
        });
        if (roleName === BUILT_IN_ROLE_NAME.ADMIN) adminRoleId = role.id;
      }
      if (!adminRoleId) throw new Error("built-in Admin role was not created");

      await tx.pipelineStage.createMany({
        data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
          organizationId: organization.id,
          name: stage.name,
          sortOrder: stage.sortOrder,
          isWon: stage.isWon,
          isLost: stage.isLost,
        })),
      });

      const membership = await tx.membership.create({
        data: {
          userId: input.superAdminUserId,
          organizationId: organization.id,
          roleId: adminRoleId,
          status: "ACTIVE",
        },
      });

      const superAdminOrganization = await tx.organization.update({
        where: { id: organization.id },
        data: { superAdminMembershipId: membership.id },
      });

      return { organization: superAdminOrganization, membership };
    });
  },

  async updateOrganizationName(organizationId: string, name: string): Promise<OrganizationRecord> {
    return prisma.organization.update({ where: { id: organizationId }, data: { name } });
  },

  async findOrganizationsOwnedByUser(userId: string): Promise<OrganizationRecord[]> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: { id: true },
    });
    const membershipIds = memberships.map((membership) => membership.id);
    if (membershipIds.length === 0) return [];

    return prisma.organization.findMany({
      where: { superAdminMembershipId: { in: membershipIds } },
    });
  },
};
