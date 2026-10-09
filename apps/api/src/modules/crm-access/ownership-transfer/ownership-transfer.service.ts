import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { crmOwnershipTransferRequestTemplate } from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import { OWNERSHIP_TRANSFER_REQUEST_TTL_MS } from "../crm-access.constants.js";
import { crmAccessRepository } from "../crm-access.repository.js";
import type {
  OrganizationRecord,
  OwnershipTransferRequestRecord,
  PendingOwnershipTransferSummary,
} from "../crm-access.types.js";
import {
  buildOrganizationAdminUrl,
  toPendingOwnershipTransferSummary,
} from "../crm-access.utils.js";
import { crmOwnershipTransferRepository } from "./ownership-transfer.repository.js";

const isOwnershipTransferPending = (request: OwnershipTransferRequestRecord): boolean =>
  !request.acceptedAt && !request.declinedAt && !request.revokedAt;

const isOwnershipTransferExpired = (request: OwnershipTransferRequestRecord): boolean =>
  request.expiresAt.getTime() <= Date.now();

export const crmOwnershipTransferService = {
  async getPendingOwnershipTransfer(
    organizationId: string,
  ): Promise<PendingOwnershipTransferSummary | null> {
    const request =
      await crmOwnershipTransferRepository.findPendingOwnershipTransfer(organizationId);
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
        HTTP_STATUS.FORBIDDEN,
      );
    }

    if (toMembershipId === fromMembershipId) {
      throw new AppError(
        "TRANSFER_SELF",
        "Can't transfer ownership to yourself.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const toMembership = await crmAccessRepository.findMembershipById(
      organization.id,
      toMembershipId,
    );
    if (!toMembership || toMembership.status !== "ACTIVE") {
      throw new AppError("MEMBERSHIP_NOT_FOUND", "Member not found.", HTTP_STATUS.NOT_FOUND);
    }

    const pendingTransfer = await crmOwnershipTransferRepository.findPendingOwnershipTransfer(
      organization.id,
    );
    if (pendingTransfer) {
      throw new AppError(
        "TRANSFER_ALREADY_PENDING",
        "An ownership transfer is already pending for this organization.",
        HTTP_STATUS.CONFLICT,
      );
    }

    await crmOwnershipTransferRepository.createOwnershipTransferRequest({
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
    const request = await crmOwnershipTransferRepository.findOwnershipTransferById(
      organization.id,
      requestId,
    );
    if (!request || !isOwnershipTransferPending(request) || isOwnershipTransferExpired(request)) {
      throw new AppError(
        "TRANSFER_INVALID",
        "This ownership transfer is no longer available.",
        HTTP_STATUS.CONFLICT,
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
        HTTP_STATUS.FORBIDDEN,
      );
    }
    if (toMembership.status !== "ACTIVE") {
      throw new AppError(
        "MEMBERSHIP_NOT_FOUND",
        "Your membership is no longer active.",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    const previousOwnerMembership = await crmAccessRepository.findMembershipById(
      organization.id,
      request.fromMembershipId,
    );

    await crmOwnershipTransferRepository.acceptOwnershipTransfer(request);

    if (request.removeSenderMembershipOnAccept && previousOwnerMembership) {
      await eventBus.publish(DomainEvents.CRM_MEMBERSHIP_ENDED, {
        organizationId: organization.id,
        userId: previousOwnerMembership.userId,
      });
    }
  },

  async declineOwnershipTransfer(
    organization: OrganizationRecord,
    requestId: string,
    decliningUserId: string,
  ): Promise<void> {
    const request = await crmOwnershipTransferRepository.findOwnershipTransferById(
      organization.id,
      requestId,
    );
    if (!request || !isOwnershipTransferPending(request) || isOwnershipTransferExpired(request)) {
      throw new AppError(
        "TRANSFER_INVALID",
        "This ownership transfer is no longer available.",
        HTTP_STATUS.CONFLICT,
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
        HTTP_STATUS.FORBIDDEN,
      );
    }

    await crmOwnershipTransferRepository.declineOwnershipTransfer(organization.id, requestId);
  },

  async revokeOwnershipTransfer(
    organization: OrganizationRecord,
    requestId: string,
  ): Promise<void> {
    const request = await crmOwnershipTransferRepository.findOwnershipTransferById(
      organization.id,
      requestId,
    );
    if (!request || !isOwnershipTransferPending(request)) {
      throw new AppError(
        "TRANSFER_INVALID",
        "This ownership transfer is no longer pending.",
        HTTP_STATUS.CONFLICT,
      );
    }

    await crmOwnershipTransferRepository.revokeOwnershipTransfer(organization.id, requestId);
  },
};
