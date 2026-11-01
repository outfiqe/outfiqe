import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { crmOwnershipTransferRequestTemplate } from "#email-templates/crm.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { MembershipStatus } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import { OWNERSHIP_TRANSFER_REQUEST_TTL_MS } from "../crm-access.constants.js";
import { crmAccessErrors } from "../crm-access.errors.js";
import { crmAccessRepository } from "../crm-access.repository.js";
import type {
  MembershipRecord,
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

const CRM_HOME_PATH = "/crm";

const requireTransferRecipient = async (
  organization: OrganizationRecord,
  fromMembershipId: string,
  toMembershipId: string,
): Promise<MembershipRecord> => {
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
  if (!toMembership || toMembership.status !== MembershipStatus.ACTIVE) {
    throw crmAccessErrors.membershipNotFound();
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

  return toMembership;
};

const emailTransferRecipient = async (
  organization: OrganizationRecord,
  recipientEmail: string,
): Promise<void> => {
  const crmUrl = buildOrganizationAdminUrl(
    organization,
    CRM_HOME_PATH,
    env.ADMIN_URL,
    env.TENANT_BASE_DOMAIN,
  );
  const { subject, html } = crmOwnershipTransferRequestTemplate(organization.name, crmUrl);
  await sendEmail({
    to: recipientEmail,
    subject,
    body: `You've been asked to become the owner of ${organization.name} on Outfiqe CRM: ${crmUrl}`,
    html,
  });
};

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
    const toMembership = await requireTransferRecipient(
      organization,
      fromMembershipId,
      toMembershipId,
    );

    await crmOwnershipTransferRepository.createOwnershipTransferRequest({
      organizationId: organization.id,
      fromMembershipId,
      toMembershipId,
      removeSenderMembershipOnAccept,
      expiresAt: new Date(Date.now() + OWNERSHIP_TRANSFER_REQUEST_TTL_MS),
    });

    const recipientUser = await userRepository.findById(toMembership.userId);
    if (!recipientUser) return;

    await emailTransferRecipient(organization, recipientUser.email);

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
      throw crmAccessErrors.transferInvalid();
    }

    const toMembership = await crmAccessRepository.findMembershipById(
      organization.id,
      request.toMembershipId,
    );
    if (!toMembership || toMembership.userId !== acceptingUserId) {
      throw crmAccessErrors.transferUserMismatch();
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
      throw crmAccessErrors.transferInvalid();
    }

    const toMembership = await crmAccessRepository.findMembershipById(
      organization.id,
      request.toMembershipId,
    );
    if (!toMembership || toMembership.userId !== decliningUserId) {
      throw crmAccessErrors.transferUserMismatch();
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
