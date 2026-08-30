import { env } from "#config/env.config.js";
import {
  crmOrganizationInviteTemplate,
  crmOwnershipTransferRequestTemplate,
} from "#email-templates/templates.js";
import { type MembershipStatus, UserRole } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { slugifyHandle, withHandleSuffix } from "#lib/handle.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import {
  isForeignKeyConstraintError,
  isUniqueConstraintError,
  uniqueConstraintTargetIncludes,
} from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { userRepository } from "#modules/users/user.repository.js";
import type { DbClient } from "#types/db.types.js";

import {
  BUILT_IN_ROLE_NAME,
  ORGANIZATION_INVITE_TTL_MS,
  OWNERSHIP_TRANSFER_REQUEST_TTL_MS,
  PLATFORM_ACCESS_PERMISSION_KEY,
  RESERVED_SUBDOMAINS,
} from "./crm-access.constants.js";
import { crmAccessRepository } from "./crm-access.repository.js";
import type {
  CreateOrganizationInput,
  MembershipRecord,
  MembershipSummary,
  OrganizationCreationSuggestion,
  OrganizationInviteSummary,
  OrganizationListItem,
  OrganizationRecord,
  OwnershipTransferRequestRecord,
  PendingOwnershipTransferSummary,
  PermissionRecord,
  RoleWithPermissions,
  UpdateRoleInput,
} from "./crm-access.types.js";
import {
  buildOrganizationAdminUrl,
  canDeleteRole,
  findUnselectablePermissionKeys,
  toInviteSummary,
  toMembershipSummary,
  toPendingOwnershipTransferSummary,
} from "./crm-access.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const FORBIDDEN_STATUS = 403;
const BAD_REQUEST_STATUS = 400;
const MAX_SUBDOMAIN_SUGGESTION_ATTEMPTS = 5;
const FIRST_SUGGESTION_ATTEMPT = 0;

const isOwnershipTransferPending = (request: OwnershipTransferRequestRecord): boolean =>
  !request.acceptedAt && !request.declinedAt && !request.revokedAt;

const generateUniqueSubdomain = async (brandName: string): Promise<string> => {
  const base = slugifyHandle(brandName);

  for (
    let attempt = FIRST_SUGGESTION_ATTEMPT;
    attempt < MAX_SUBDOMAIN_SUGGESTION_ATTEMPTS;
    attempt++
  ) {
    const candidate = attempt === FIRST_SUGGESTION_ATTEMPT ? base : withHandleSuffix(base);
    if (RESERVED_SUBDOMAINS.includes(candidate)) continue;

    const existing = await crmAccessRepository.findOrganizationBySubdomain(candidate);
    if (!existing) return candidate;
  }

  throw new AppError(
    "SUBDOMAIN_SUGGESTION_FAILED",
    "Couldn't find an available subdomain for this brand. Enter one manually.",
    CONFLICT_STATUS,
  );
};

const isOwnershipTransferExpired = (request: OwnershipTransferRequestRecord): boolean =>
  request.expiresAt.getTime() <= Date.now();

const assertPermissionKeysSelectable = (permissionKeys: string[]): void => {
  const unselectable = findUnselectablePermissionKeys(permissionKeys);
  if (unselectable.length > 0) {
    throw new AppError(
      "INVALID_PERMISSION_KEYS",
      "One or more of the selected permissions can't be granted to a custom role.",
      BAD_REQUEST_STATUS,
    );
  }
};

const asRoleNameConflict = (err: unknown): unknown =>
  isUniqueConstraintError(err)
    ? new AppError("ROLE_NAME_TAKEN", "A role with that name already exists.", CONFLICT_STATUS)
    : err;

export const crmAccessService = {
  async resolveHasPlatformAccess(userId: string): Promise<boolean> {
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    const platformMembership = platformOrganization
      ? await crmAccessRepository.findMembershipByUserAndOrg(userId, platformOrganization.id)
      : null;

    if (!platformMembership || platformMembership.status !== "ACTIVE") return false;

    const isSuperAdmin = platformOrganization?.superAdminMembershipId === platformMembership.id;
    const hasPlatformPermission = platformMembership.role.permissionKeys.includes(
      PLATFORM_ACCESS_PERMISSION_KEY,
    );
    return isSuperAdmin || hasPlatformPermission;
  },

  async resolveHasCrmAccess(userId: string): Promise<boolean> {
    return crmAccessRepository.hasActiveMembership(userId);
  },

  async grantPlatformStaffMembership(
    userId: string,
    client?: DbClient,
  ): Promise<MembershipRecord | null> {
    return crmAccessRepository.grantPlatformStaffMembership(userId, client);
  },

  async createOrganization(input: CreateOrganizationInput): Promise<OrganizationRecord> {
    const { name, subdomain, creatingUserId, targetOwnerUserId, linkedBrandId } = input;

    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      throw new AppError(
        "SUBDOMAIN_RESERVED",
        "This subdomain is reserved and can't be used.",
        CONFLICT_STATUS,
      );
    }

    let organization: OrganizationRecord;
    let creatorMembershipId: string;
    try {
      const created = await crmAccessRepository.createOrganization({
        name,
        subdomain,
        superAdminUserId: creatingUserId,
        linkedBrandId,
      });
      organization = created.organization;
      creatorMembershipId = created.membership.id;
    } catch (err) {
      if (uniqueConstraintTargetIncludes(err, "linked_brand_id")) {
        throw new AppError(
          "BRAND_ALREADY_LINKED",
          "This business is already linked to another organization.",
          CONFLICT_STATUS,
        );
      }
      if (isUniqueConstraintError(err)) {
        throw new AppError("SUBDOMAIN_TAKEN", "This subdomain is already in use.", CONFLICT_STATUS);
      }
      throw err;
    }

    const isHandingOffToSomeoneElse =
      targetOwnerUserId !== undefined && targetOwnerUserId !== creatingUserId;
    if (!isHandingOffToSomeoneElse) return organization;

    const roles = await crmAccessRepository.listRoles(organization.id);
    const adminRole = roles.find((role) => role.name === BUILT_IN_ROLE_NAME.ADMIN);
    if (!adminRole) throw new Error("built-in Admin role was not created");

    const targetMembership = await crmAccessRepository.createMembership(
      targetOwnerUserId,
      organization.id,
      adminRole.id,
      "ACTIVE",
    );

    await crmAccessService.createOwnershipTransfer(
      organization,
      creatorMembershipId,
      targetMembership.id,
      true,
    );

    return organization;
  },

  async suggestOrganizationFromBrand(brandId: string): Promise<OrganizationCreationSuggestion> {
    const brand = await brandRepository.findById(brandId);
    if (!brand) {
      throw new AppError("BRAND_NOT_FOUND", "Brand not found.", NOT_FOUND_STATUS);
    }

    const ownerUserId = await brandRepository.findOwnerUserId(brandId);
    const owner = ownerUserId ? await userRepository.findById(ownerUserId) : null;
    if (!ownerUserId || !owner) {
      throw new AppError(
        "BRAND_HAS_NO_OWNER",
        "This brand has no owner account to invite.",
        CONFLICT_STATUS,
      );
    }

    const suggestedSubdomain = await generateUniqueSubdomain(brand.name);
    const ownerOrganizations = await crmAccessRepository.findOrganizationsOwnedByUser(ownerUserId);
    const organizationAlreadyLinkedToBrand =
      await crmAccessRepository.findOrganizationByLinkedBrandId(brandId);

    return {
      brandId: brand.id,
      brandName: brand.name,
      ownerUserId,
      ownerName: owner.name,
      suggestedSubdomain,
      ownerExistingOrganizations: ownerOrganizations.map((existingOrganization) => ({
        id: existingOrganization.id,
        name: existingOrganization.name,
      })),
      existingOrganizationForBrand: organizationAlreadyLinkedToBrand
        ? {
            id: organizationAlreadyLinkedToBrand.id,
            name: organizationAlreadyLinkedToBrand.name,
          }
        : null,
    };
  },

  async listOrganizations(): Promise<OrganizationListItem[]> {
    return crmAccessRepository.listOrganizations();
  },

  async listPermissions(): Promise<PermissionRecord[]> {
    return crmAccessRepository.listPermissions();
  },

  async listRoles(organizationId: string): Promise<RoleWithPermissions[]> {
    return crmAccessRepository.listRoles(organizationId);
  },

  async createRole(
    organizationId: string,
    input: { name: string; permissionKeys: string[] },
  ): Promise<RoleWithPermissions> {
    assertPermissionKeysSelectable(input.permissionKeys);
    try {
      return await crmAccessRepository.createRole({
        organizationId,
        name: input.name,
        isBuiltIn: false,
        permissionKeys: input.permissionKeys,
      });
    } catch (err) {
      throw asRoleNameConflict(err);
    }
  },

  async updateRole(
    organizationId: string,
    roleId: string,
    input: UpdateRoleInput,
  ): Promise<RoleWithPermissions> {
    const role = await crmAccessRepository.findRoleById(organizationId, roleId);
    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Role not found.", NOT_FOUND_STATUS);
    }
    if (role.isBuiltIn) {
      throw new AppError("ROLE_IS_BUILT_IN", "Built-in roles can't be edited.", FORBIDDEN_STATUS);
    }
    if (input.permissionKeys !== undefined) {
      assertPermissionKeysSelectable(input.permissionKeys);
    }

    try {
      return await crmAccessRepository.updateRole(organizationId, roleId, input);
    } catch (err) {
      throw asRoleNameConflict(err);
    }
  },

  async deleteRole(organizationId: string, roleId: string): Promise<void> {
    const role = await crmAccessRepository.findRoleById(organizationId, roleId);
    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Role not found.", NOT_FOUND_STATUS);
    }
    if (role.isBuiltIn) {
      throw new AppError("ROLE_IS_BUILT_IN", "Built-in roles can't be deleted.", FORBIDDEN_STATUS);
    }

    const memberCount = await crmAccessRepository.countMembershipsForRole(organizationId, roleId);
    if (!canDeleteRole(role, memberCount)) {
      throw new AppError(
        "ROLE_IN_USE",
        "Reassign every member on this role before deleting it.",
        CONFLICT_STATUS,
      );
    }

    try {
      await crmAccessRepository.deleteRole(organizationId, roleId);
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        throw new AppError(
          "ROLE_IN_USE",
          "Reassign every member on this role before deleting it.",
          CONFLICT_STATUS,
        );
      }
      throw err;
    }
  },

  async updateOrganization(
    organization: OrganizationRecord,
    input: { name: string },
  ): Promise<OrganizationRecord> {
    return crmAccessRepository.updateOrganizationName(organization.id, input.name);
  },

  async listMembers(organization: OrganizationRecord): Promise<MembershipSummary[]> {
    const memberships = await crmAccessRepository.listMemberships(organization.id);
    return memberships.map((membership) =>
      toMembershipSummary(membership, organization.superAdminMembershipId),
    );
  },

  async updateMembership(
    organization: OrganizationRecord,
    membershipId: string,
    data: { roleId?: string; status?: MembershipStatus },
  ): Promise<MembershipRecord> {
    if (organization.superAdminMembershipId === membershipId) {
      throw new AppError(
        "SUPERADMIN_MEMBERSHIP_LOCKED",
        "The SUPERADMIN membership can't be edited this way. Use ownership transfer instead.",
        FORBIDDEN_STATUS,
      );
    }

    const membership = await crmAccessRepository.findMembershipById(organization.id, membershipId);
    if (!membership) {
      throw new AppError("MEMBERSHIP_NOT_FOUND", "Member not found.", NOT_FOUND_STATUS);
    }

    if (data.roleId) {
      const role = await crmAccessRepository.findRoleById(organization.id, data.roleId);
      if (!role) {
        throw new AppError("ROLE_NOT_FOUND", "Role not found.", NOT_FOUND_STATUS);
      }
    }

    return crmAccessRepository.updateMembership(organization.id, membershipId, data);
  },

  async listInvites(organizationId: string): Promise<OrganizationInviteSummary[]> {
    const invites = await crmAccessRepository.listInvites(organizationId);
    return invites.map(toInviteSummary);
  },

  async inviteMember(
    organization: OrganizationRecord,
    email: string,
    roleId: string,
    invitedById: string,
  ): Promise<void> {
    const role = await crmAccessRepository.findRoleById(organization.id, roleId);
    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Role not found.", NOT_FOUND_STATUS);
    }

    const invitedUser = await userRepository.findByEmail(email);
    if (!invitedUser || invitedUser.role !== UserRole.ADMIN) {
      throw new AppError(
        "STAFF_ACCOUNT_NOT_FOUND",
        "This email doesn't match an existing Outfiqe staff account.",
        NOT_FOUND_STATUS,
      );
    }

    const existingMembership = await crmAccessRepository.findMembershipByUserAndOrg(
      invitedUser.id,
      organization.id,
    );
    if (existingMembership) {
      throw new AppError("MEMBER_EXISTS", "This person already has CRM access.", CONFLICT_STATUS);
    }

    const pendingInvite = await crmAccessRepository.findPendingInviteByEmail(
      organization.id,
      email,
    );
    if (pendingInvite) {
      throw new AppError(
        "INVITE_ALREADY_PENDING",
        "An invite is already pending for this email.",
        CONFLICT_STATUS,
      );
    }

    const rawToken = generateOpaqueToken();
    await crmAccessRepository.createInvite({
      organizationId: organization.id,
      email,
      roleId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ORGANIZATION_INVITE_TTL_MS),
      invitedById,
    });

    const inviteUrl = buildOrganizationAdminUrl(
      organization,
      `/crm/invites/accept?token=${rawToken}`,
      env.ADMIN_URL,
      env.TENANT_BASE_DOMAIN,
    );
    const { subject, html } = crmOrganizationInviteTemplate(role.name, inviteUrl);

    await sendEmail({
      to: email,
      subject,
      body: `You've been invited to the Outfiqe CRM as ${role.name}: ${inviteUrl}`,
      html,
    });

    logger.info(`CRM invite sent to ${email} by ${invitedById}`);
  },

  async revokeInvite(organizationId: string, inviteId: string): Promise<void> {
    await crmAccessRepository.revokeInvite(organizationId, inviteId);
  },

  async acceptInvite(rawToken: string, acceptingUserId: string): Promise<MembershipRecord> {
    const invite = await crmAccessRepository.findInviteByTokenHash(hashToken(rawToken));
    if (!invite) {
      throw new AppError("INVITE_INVALID", "This invite link is invalid.", NOT_FOUND_STATUS);
    }
    if (invite.acceptedAt || invite.revokedAt || invite.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_INVALID",
        "This invite link has expired or was already used.",
        CONFLICT_STATUS,
      );
    }

    const acceptingUser = await userRepository.findById(acceptingUserId);
    if (!acceptingUser || acceptingUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new AppError(
        "INVITE_EMAIL_MISMATCH",
        "This invite was sent to a different account.",
        FORBIDDEN_STATUS,
      );
    }

    const existingMembership = await crmAccessRepository.findMembershipByUserAndOrg(
      acceptingUserId,
      invite.organizationId,
    );
    if (existingMembership) {
      throw new AppError("MEMBER_EXISTS", "You already have CRM access.", CONFLICT_STATUS);
    }

    try {
      return await crmAccessRepository.acceptInvite(invite, acceptingUserId);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new AppError("MEMBER_EXISTS", "You already have CRM access.", CONFLICT_STATUS);
      }
      throw err;
    }
  },

  async getPendingOwnershipTransfer(
    organizationId: string,
  ): Promise<PendingOwnershipTransferSummary | null> {
    const request = await crmAccessRepository.findPendingOwnershipTransfer(organizationId);
    return request ? toPendingOwnershipTransferSummary(request) : null;
  },

  async createOwnershipTransfer(
    organization: OrganizationRecord,
    fromMembershipId: string,
    toMembershipId: string,
    removeSenderMembershipOnAccept: boolean,
  ): Promise<void> {
    if (organization.superAdminMembershipId !== fromMembershipId) {
      throw new AppError(
        "NOT_SUPERADMIN",
        "Only the current owner can transfer ownership.",
        FORBIDDEN_STATUS,
      );
    }

    if (toMembershipId === fromMembershipId) {
      throw new AppError(
        "TRANSFER_SELF",
        "Can't transfer ownership to yourself.",
        BAD_REQUEST_STATUS,
      );
    }

    const toMembership = await crmAccessRepository.findMembershipById(
      organization.id,
      toMembershipId,
    );
    if (!toMembership || toMembership.status !== "ACTIVE") {
      throw new AppError("MEMBERSHIP_NOT_FOUND", "Member not found.", NOT_FOUND_STATUS);
    }

    const pendingTransfer = await crmAccessRepository.findPendingOwnershipTransfer(organization.id);
    if (pendingTransfer) {
      throw new AppError(
        "TRANSFER_ALREADY_PENDING",
        "An ownership transfer is already pending for this organization.",
        CONFLICT_STATUS,
      );
    }

    await crmAccessRepository.createOwnershipTransferRequest({
      organizationId: organization.id,
      fromMembershipId,
      toMembershipId,
      removeSenderMembershipOnAccept,
      expiresAt: new Date(Date.now() + OWNERSHIP_TRANSFER_REQUEST_TTL_MS),
    });

    const recipientUser = await userRepository.findById(toMembership.userId);
    if (!recipientUser) return;

    const crmUrl = buildOrganizationAdminUrl(
      organization,
      "/crm",
      env.ADMIN_URL,
      env.TENANT_BASE_DOMAIN,
    );
    const { subject, html } = crmOwnershipTransferRequestTemplate(organization.name, crmUrl);
    await sendEmail({
      to: recipientUser.email,
      subject,
      body: `You've been asked to become the owner of ${organization.name} on Outfiqe CRM: ${crmUrl}`,
      html,
    });

    logger.info(`Ownership transfer requested for ${organization.id} to ${toMembershipId}`);
  },

  async acceptOwnershipTransfer(
    organization: OrganizationRecord,
    requestId: string,
    acceptingUserId: string,
  ): Promise<void> {
    const request = await crmAccessRepository.findOwnershipTransferById(organization.id, requestId);
    if (!request || !isOwnershipTransferPending(request) || isOwnershipTransferExpired(request)) {
      throw new AppError(
        "TRANSFER_INVALID",
        "This ownership transfer is no longer available.",
        CONFLICT_STATUS,
      );
    }

    const toMembership = await crmAccessRepository.findMembershipById(
      organization.id,
      request.toMembershipId,
    );
    if (!toMembership || toMembership.userId !== acceptingUserId) {
      throw new AppError(
        "TRANSFER_USER_MISMATCH",
        "This ownership transfer wasn't addressed to you.",
        FORBIDDEN_STATUS,
      );
    }
    if (toMembership.status !== "ACTIVE") {
      throw new AppError(
        "MEMBERSHIP_NOT_FOUND",
        "Your membership is no longer active.",
        NOT_FOUND_STATUS,
      );
    }

    await crmAccessRepository.acceptOwnershipTransfer(request);
  },

  async declineOwnershipTransfer(
    organization: OrganizationRecord,
    requestId: string,
    decliningUserId: string,
  ): Promise<void> {
    const request = await crmAccessRepository.findOwnershipTransferById(organization.id, requestId);
    if (!request || !isOwnershipTransferPending(request) || isOwnershipTransferExpired(request)) {
      throw new AppError(
        "TRANSFER_INVALID",
        "This ownership transfer is no longer available.",
        CONFLICT_STATUS,
      );
    }

    const toMembership = await crmAccessRepository.findMembershipById(
      organization.id,
      request.toMembershipId,
    );
    if (!toMembership || toMembership.userId !== decliningUserId) {
      throw new AppError(
        "TRANSFER_USER_MISMATCH",
        "This ownership transfer wasn't addressed to you.",
        FORBIDDEN_STATUS,
      );
    }

    await crmAccessRepository.declineOwnershipTransfer(organization.id, requestId);
  },

  async revokeOwnershipTransfer(
    organization: OrganizationRecord,
    requestId: string,
  ): Promise<void> {
    const request = await crmAccessRepository.findOwnershipTransferById(organization.id, requestId);
    if (!request || !isOwnershipTransferPending(request)) {
      throw new AppError(
        "TRANSFER_INVALID",
        "This ownership transfer is no longer pending.",
        CONFLICT_STATUS,
      );
    }

    await crmAccessRepository.revokeOwnershipTransfer(organization.id, requestId);
  },
};
