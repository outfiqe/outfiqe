import { prisma } from "#db/prisma.js";

import type {
  CreateOwnershipTransferRequestInput,
  OwnershipTransferJoinRow,
  OwnershipTransferRequestRecord,
} from "../crm-access.types.js";

export const crmOwnershipTransferRepository = {
  async createOwnershipTransferRequest(
    input: CreateOwnershipTransferRequestInput,
  ): Promise<OwnershipTransferRequestRecord> {
    return prisma.ownershipTransferRequest.create({ data: input });
  },

  async findOwnershipTransferById(
    organizationId: string,
    requestId: string,
  ): Promise<OwnershipTransferRequestRecord | null> {
    return prisma.ownershipTransferRequest.findFirst({
      where: { id: requestId, organizationId },
    });
  },

  async findPendingOwnershipTransfer(
    organizationId: string,
  ): Promise<OwnershipTransferJoinRow | null> {
    return prisma.ownershipTransferRequest.findFirst({
      where: {
        organizationId,
        acceptedAt: null,
        declinedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        toMembership: { select: { userId: true, user: { select: { name: true } } } },
        fromMembership: { select: { user: { select: { name: true } } } },
      },
    });
  },

  async acceptOwnershipTransfer(request: OwnershipTransferRequestRecord): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: request.organizationId },
        data: { superAdminMembershipId: request.toMembershipId },
      });

      await tx.ownershipTransferRequest.update({
        where: { id: request.id },
        data: { acceptedAt: new Date() },
      });

      if (request.removeSenderMembershipOnAccept) {
        await tx.membership.delete({ where: { id: request.fromMembershipId } });
      }
    });
  },

  async declineOwnershipTransfer(organizationId: string, requestId: string): Promise<void> {
    await prisma.ownershipTransferRequest.update({
      where: { id: requestId, organizationId },
      data: { declinedAt: new Date() },
    });
  },

  async revokeOwnershipTransfer(organizationId: string, requestId: string): Promise<void> {
    await prisma.ownershipTransferRequest.update({
      where: { id: requestId, organizationId },
      data: { revokedAt: new Date() },
    });
  },
};
