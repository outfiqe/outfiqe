import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type MembershipStatusValue,
  type MembershipSummary,
  membershipSummarySchema,
  type Organization,
  type OrganizationInviteSummary,
  organizationInviteSummarySchema,
  organizationSchema,
  type Role,
  roleSchema,
} from "./schemas";

const membersListSchema = z.array(membershipSummarySchema);
const rolesListSchema = z.array(roleSchema);
const invitesListSchema = z.array(organizationInviteSummarySchema);

export const crmApi = {
  async getOrganization(): Promise<Organization> {
    const res = await apiClient.get<Organization>("/crm/organization");
    return organizationSchema.parse(res.data);
  },

  async listRoles(): Promise<Role[]> {
    const res = await apiClient.get<Role[]>("/crm/roles");
    return rolesListSchema.parse(res.data);
  },

  async listMembers(): Promise<MembershipSummary[]> {
    const res = await apiClient.get<MembershipSummary[]>("/crm/members");
    return membersListSchema.parse(res.data);
  },

  async updateMember(
    membershipId: string,
    body: { roleId?: string; status?: MembershipStatusValue },
  ): Promise<void> {
    await apiClient.patch(`/crm/members/${membershipId}`, body);
  },

  async listInvites(): Promise<OrganizationInviteSummary[]> {
    const res = await apiClient.get<OrganizationInviteSummary[]>("/crm/invites");
    return invitesListSchema.parse(res.data);
  },

  async createInvite(email: string, roleId: string): Promise<void> {
    await apiClient.post("/crm/invites", { email, roleId });
  },

  async revokeInvite(inviteId: string): Promise<void> {
    await apiClient.del(`/crm/invites/${inviteId}`);
  },

  async acceptInvite(token: string): Promise<void> {
    await apiClient.post("/crm/invites/accept", { token });
  },

  async createOwnershipTransfer(
    toMembershipId: string,
    removeSenderMembership: boolean,
  ): Promise<void> {
    await apiClient.post("/crm/ownership-transfer", { toMembershipId, removeSenderMembership });
  },

  async acceptOwnershipTransfer(requestId: string): Promise<void> {
    await apiClient.post(`/crm/ownership-transfer/${requestId}/accept`);
  },

  async declineOwnershipTransfer(requestId: string): Promise<void> {
    await apiClient.post(`/crm/ownership-transfer/${requestId}/decline`);
  },

  async revokeOwnershipTransfer(requestId: string): Promise<void> {
    await apiClient.del(`/crm/ownership-transfer/${requestId}`);
  },
};
