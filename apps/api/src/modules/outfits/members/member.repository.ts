import type { Prisma } from "#generated/prisma/client.js";
import { AccountStatus, OutfitMemberRole, UserRole } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import { OFFER_STATUSES_AWAITING_CREATOR } from "../outfit.constants.js";
import { outfitPersonSelect } from "../outfit.query-helpers.js";

export const outfitMemberRepository = {
  async findMemberRole(
    client: DbClient,
    outfitId: string,
    userId: string,
  ): Promise<OutfitMemberRole | null> {
    const member = await client.outfitMember.findUnique({
      where: { outfitId_userId: { outfitId, userId } },
      select: { role: true },
    });
    return member?.role ?? null;
  },

  async listMembers(tx: Prisma.TransactionClient, outfitId: string) {
    return tx.outfitMember.findMany({
      where: { outfitId },
      select: { userId: true, role: true, isHappy: true },
    });
  },

  async listMemberRoles(client: DbClient, outfitId: string) {
    return client.outfitMember.findMany({
      where: { outfitId },
      select: { userId: true, role: true },
    });
  },

  async addEditors(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userIds: string[],
    invitedById: string,
  ): Promise<void> {
    await tx.outfitMember.createMany({
      data: userIds.map((userId) => ({
        outfitId,
        userId,
        invitedById,
        role: OutfitMemberRole.EDITOR,
      })),
    });
  },

  async removeMember(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
  ): Promise<void> {
    await tx.outfitMember.delete({ where: { outfitId_userId: { outfitId, userId } } });
  },

  async removeContributorFromSnapshots(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
  ): Promise<void> {
    await tx.$executeRaw`
      UPDATE outfit_snapshots
      SET contributor_ids = array_remove(contributor_ids, ${userId}::uuid)
      WHERE outfit_id = ${outfitId}::uuid AND ${userId}::uuid = ANY(contributor_ids)
    `;
  },

  async hasOfferAwaitingCreator(
    tx: Prisma.TransactionClient,
    outfitId: string,
    creatorId: string,
  ): Promise<boolean> {
    const openOffer = await tx.outfitOffer.findFirst({
      where: { outfitId, creatorId, status: { in: [...OFFER_STATUSES_AWAITING_CREATOR] } },
      select: { id: true },
    });
    return openOffer !== null;
  },

  async setMemberRole(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
    role: OutfitMemberRole,
  ): Promise<void> {
    await tx.outfitMember.update({
      where: { outfitId_userId: { outfitId, userId } },
      data: { role },
    });
  },

  async findPeople(client: DbClient, userIds: string[]) {
    return client.user.findMany({
      where: { id: { in: userIds }, accountStatus: AccountStatus.ACTIVE },
      select: outfitPersonSelect,
    });
  },

  async findPersonReference(client: DbClient, userId: string) {
    return client.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  },

  async findInvitablePeople(client: DbClient, userIds: string[]) {
    return client.user.findMany({
      where: {
        id: { in: userIds },
        accountStatus: AccountStatus.ACTIVE,
        role: { in: [UserRole.CUSTOMER, UserRole.BRAND_OWNER] },
      },
      select: { id: true, name: true },
    });
  },
};
