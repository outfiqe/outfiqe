import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import { getResolvedOrganization } from "./crm-access.middleware.js";
import type {
  AcceptOrganizationInviteBody,
  CreateOrganizationBody,
  CreateOrganizationInviteBody,
  InviteIdParams,
  MembershipIdParams,
  UpdateMembershipBody,
} from "./crm-access.schemas.js";
import { crmAccessService } from "./crm-access.service.js";

const CREATED_STATUS = 201;

export const crmAccessController = {
  async createOrganization(_req: Request, res: Response) {
    const { name, subdomain } = validated.body<CreateOrganizationBody>(res);
    const principal = requireAuthPrincipal(res);

    const organization = await crmAccessService.createOrganization(
      name,
      subdomain,
      principal.userId,
    );
    sendSuccess(res, organization, "Organization created.", CREATED_STATUS);
  },

  async listOrganizations(_req: Request, res: Response) {
    const organizations = await crmAccessService.listOrganizations();
    sendSuccess(res, organizations, "Organizations.");
  },

  async getOrganization(_req: Request, res: Response) {
    sendSuccess(res, getResolvedOrganization(res), "CRM organization.");
  },

  async listPermissions(_req: Request, res: Response) {
    const permissions = await crmAccessService.listPermissions();
    sendSuccess(res, permissions, "CRM permission catalog.");
  },

  async listRoles(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const roles = await crmAccessService.listRoles(organization.id);
    sendSuccess(res, roles, "CRM roles.");
  },

  async listMembers(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const members = await crmAccessService.listMembers(organization);
    sendSuccess(res, members, "CRM members.");
  },

  async updateMember(_req: Request, res: Response) {
    const { membershipId } = validated.params<MembershipIdParams>(res);
    const body = validated.body<UpdateMembershipBody>(res);
    const organization = getResolvedOrganization(res);

    const membership = await crmAccessService.updateMembership(organization, membershipId, body);
    sendSuccess(res, membership, "Member updated.");
  },

  async listInvites(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const invites = await crmAccessService.listInvites(organization.id);
    sendSuccess(res, invites, "Pending CRM invites.");
  },

  async createInvite(_req: Request, res: Response) {
    const { email, roleId } = validated.body<CreateOrganizationInviteBody>(res);
    const principal = requireAuthPrincipal(res);
    const organization = getResolvedOrganization(res);

    await crmAccessService.inviteMember(organization, email, roleId, principal.userId);
    sendSuccess(res, null, "Invite sent.", CREATED_STATUS);
  },

  async revokeInvite(_req: Request, res: Response) {
    const { inviteId } = validated.params<InviteIdParams>(res);
    const organization = getResolvedOrganization(res);

    await crmAccessService.revokeInvite(organization.id, inviteId);
    sendSuccess(res, null, "Invite revoked.");
  },

  async acceptInvite(_req: Request, res: Response) {
    const { token } = validated.body<AcceptOrganizationInviteBody>(res);
    const principal = requireAuthPrincipal(res);

    const membership = await crmAccessService.acceptInvite(token, principal.userId);
    sendSuccess(res, membership, "CRM access granted.", CREATED_STATUS);
  },
};
