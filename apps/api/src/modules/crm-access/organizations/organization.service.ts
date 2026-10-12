import { HTTP_STATUS } from "#constants/http.constants.js";
import { slugifyHandle, withHandleSuffix } from "#lib/handle.utils.js";
import { isUniqueConstraintError, uniqueConstraintTargetIncludes } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { userRepository } from "#modules/users/user.repository.js";

import { BUILT_IN_ROLE_NAME, RESERVED_SUBDOMAINS } from "../crm-access.constants.js";
import { crmAccessRepository } from "../crm-access.repository.js";
import type {
  CreateOrganizationInput,
  OrganizationCreationSuggestion,
  OrganizationListItem,
  OrganizationListPage,
  OrganizationRecord,
} from "../crm-access.types.js";
import { crmOwnershipTransferService } from "../ownership-transfer/ownership-transfer.service.js";
import { crmRoleRepository } from "../roles/role.repository.js";
import { crmOrganizationRepository } from "./organization.repository.js";

const MAX_SUBDOMAIN_SUGGESTION_ATTEMPTS = 5;
const FIRST_SUGGESTION_ATTEMPT = 0;

const generateUniqueSubdomain = async (brandName: string): Promise<string> => {
  const base = slugifyHandle(brandName);

  for (
    let attempt = FIRST_SUGGESTION_ATTEMPT;
    attempt < MAX_SUBDOMAIN_SUGGESTION_ATTEMPTS;
    attempt++
  ) {
    const candidate = attempt === FIRST_SUGGESTION_ATTEMPT ? base : withHandleSuffix(base);
    if (RESERVED_SUBDOMAINS.includes(candidate)) continue;

    const existing = await crmOrganizationRepository.findOrganizationBySubdomain(candidate);
    if (!existing) return candidate;
  }

  throw new AppError(
    "SUBDOMAIN_SUGGESTION_FAILED",
    "Couldn't find an available subdomain for this brand. Enter one manually.",
    HTTP_STATUS.CONFLICT,
  );
};

const withLinkedBrandName = async (
  organization: OrganizationRecord,
): Promise<OrganizationListItem> => {
  if (!organization.linkedBrandId) return { ...organization, linkedBrandName: null };

  const linkedBrand = await brandRepository.findById(organization.linkedBrandId);
  return { ...organization, linkedBrandName: linkedBrand?.name ?? null };
};

export const crmOrganizationService = {
  async createOrganization(input: CreateOrganizationInput): Promise<OrganizationListItem> {
    const { name, subdomain, creatingUserId, targetOwnerUserId, linkedBrandId } = input;

    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      throw new AppError(
        "SUBDOMAIN_RESERVED",
        "This subdomain is reserved and can't be used.",
        HTTP_STATUS.CONFLICT,
      );
    }

    let organization: OrganizationRecord;
    let creatorMembershipId: string;
    try {
      const created = await crmOrganizationRepository.createOrganization({
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
          HTTP_STATUS.CONFLICT,
        );
      }
      if (isUniqueConstraintError(err)) {
        throw new AppError(
          "SUBDOMAIN_TAKEN",
          "This subdomain is already in use.",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw err;
    }

    const isHandingOffToSomeoneElse =
      targetOwnerUserId !== undefined && targetOwnerUserId !== creatingUserId;
    if (!isHandingOffToSomeoneElse) return withLinkedBrandName(organization);

    const roles = await crmRoleRepository.listRoles(organization.id);
    const adminRole = roles.find((role) => role.name === BUILT_IN_ROLE_NAME.ADMIN);
    if (!adminRole) throw new Error("built-in Admin role was not created");

    const targetMembership = await crmAccessRepository.createMembership(
      targetOwnerUserId,
      organization.id,
      adminRole.id,
      "ACTIVE",
    );

    await crmOwnershipTransferService.createOwnershipTransfer(
      organization,
      creatorMembershipId,
      targetMembership.id,
      true,
    );

    return withLinkedBrandName(organization);
  },

  async suggestOrganizationFromBrand(brandId: string): Promise<OrganizationCreationSuggestion> {
    const brand = await brandRepository.findById(brandId);
    if (!brand) {
      throw new AppError("BRAND_NOT_FOUND", "Brand not found.", HTTP_STATUS.NOT_FOUND);
    }

    const ownerUserId = await brandRepository.findOwnerUserId(brandId);
    const owner = ownerUserId ? await userRepository.findById(ownerUserId) : null;
    if (!ownerUserId || !owner) {
      throw new AppError(
        "BRAND_HAS_NO_OWNER",
        "This brand has no owner account to invite.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const suggestedSubdomain = await generateUniqueSubdomain(brand.name);
    const ownerOrganizations =
      await crmOrganizationRepository.findOrganizationsOwnedByUser(ownerUserId);
    const organizationAlreadyLinkedToBrand =
      await crmOrganizationRepository.findOrganizationByLinkedBrandId(brandId);

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

  async listOrganizations(params: {
    cursor?: string;
    limit: number;
  }): Promise<OrganizationListPage> {
    const rows = await crmOrganizationRepository.listOrganizations(params);

    const hasMore = rows.length > params.limit;
    const organizations = hasMore ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasMore ? (organizations.at(-1)?.id ?? null) : null;

    return { organizations, nextCursor };
  },

  async updateOrganization(
    organization: OrganizationRecord,
    input: { name: string },
  ): Promise<OrganizationRecord> {
    return crmOrganizationRepository.updateOrganizationName(organization.id, input.name);
  },
};
