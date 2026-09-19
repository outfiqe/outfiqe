import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { getCoFounderContext } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import type {
  CreatePlatformRoleBody,
  PlatformRoleIdParams,
  PlatformTeamMembershipIdParams,
  UpdatePlatformRoleBody,
  UpdatePlatformTeamMemberBody,
} from "./platform-roles.schemas.js";
import { platformRolesService } from "./platform-roles.service.js";

const CREATED_STATUS = 201;

export const platformRolesController = {
  async listPermissions(_req: Request, res: Response) {
    sendSuccess(res, await platformRolesService.listPermissions(), "Platform permissions.");
  },

  async listRoles(_req: Request, res: Response) {
    sendSuccess(res, await platformRolesService.listRoles(), "Platform roles.");
  },

  async createRole(_req: Request, res: Response) {
    const body = validated.body<CreatePlatformRoleBody>(res);
    const context = getCoFounderContext(res);

    const role = await platformRolesService.createRole(body);

    await platformAudit.record({
      actorUserId: context.userId,
      action: PLATFORM_AUDIT_ACTION.PLATFORM_ROLE_CREATED,
      summary: `Created platform role "${role.name}"`,
      targetType: "role",
      targetId: role.id,
      metadata: { permissionKeys: role.permissionKeys },
    });

    sendSuccess(res, role, "Platform role created.", CREATED_STATUS);
  },

  async updateRole(_req: Request, res: Response) {
    const { roleId } = validated.params<PlatformRoleIdParams>(res);
    const body = validated.body<UpdatePlatformRoleBody>(res);
    const context = getCoFounderContext(res);

    const role = await platformRolesService.updateRole(roleId, body);

    await platformAudit.record({
      actorUserId: context.userId,
      action: PLATFORM_AUDIT_ACTION.PLATFORM_ROLE_UPDATED,
      summary: `Updated platform role "${role.name}"`,
      targetType: "role",
      targetId: role.id,
      metadata: { permissionKeys: role.permissionKeys },
    });

    sendSuccess(res, role, "Platform role updated.");
  },

  async deleteRole(_req: Request, res: Response) {
    const { roleId } = validated.params<PlatformRoleIdParams>(res);
    const context = getCoFounderContext(res);

    await platformRolesService.deleteRole(roleId);

    await platformAudit.record({
      actorUserId: context.userId,
      action: PLATFORM_AUDIT_ACTION.PLATFORM_ROLE_DELETED,
      summary: "Deleted a platform role",
      targetType: "role",
      targetId: roleId,
    });

    sendSuccess(res, null, "Platform role deleted.");
  },

  async listTeam(_req: Request, res: Response) {
    sendSuccess(res, await platformRolesService.listTeam(), "Platform team.");
  },

  async updateTeamMember(_req: Request, res: Response) {
    const { membershipId } = validated.params<PlatformTeamMembershipIdParams>(res);
    const body = validated.body<UpdatePlatformTeamMemberBody>(res);
    const context = getCoFounderContext(res);

    const membership = await platformRolesService.updateTeamMember(
      context.membershipId,
      membershipId,
      body,
    );

    await platformAudit.record({
      actorUserId: context.userId,
      action: PLATFORM_AUDIT_ACTION.PLATFORM_TEAM_MEMBER_ROLE_CHANGED,
      summary: `Updated a platform team member's access`,
      targetType: "membership",
      targetId: membership.id,
      metadata: body,
    });

    sendSuccess(res, membership, "Platform team member updated.");
  },
};
