import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { RiderStatus } from "#generated/prisma/enums.js";
import { type IdentityDocumentType, RiderTaskStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

export const riderWithUserAndHub = {
  user: { select: { name: true, email: true, phone: true } },
  hub: { select: { name: true } },
} satisfies Prisma.RiderInclude;

export type RiderRecord = Prisma.RiderGetPayload<{ include: typeof riderWithUserAndHub }>;

const OPEN_TASK_STATUSES = [RiderTaskStatus.ASSIGNED, RiderTaskStatus.IN_PROGRESS];

type CreateRiderInviteInput = Omit<
  Prisma.RiderInviteUncheckedCreateInput,
  "id" | "createdAt" | "acceptedAt"
>;

type CreateRiderProfileInput = Pick<
  Prisma.RiderUncheckedCreateInput,
  "userId" | "hubId" | "employmentType" | "status"
>;

export const logisticsRiderRepository = {
  async findPendingRiderInviteByEmail(email: string) {
    return prisma.riderInvite.findFirst({
      where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
  },

  async createRiderInvite(invite: CreateRiderInviteInput): Promise<void> {
    await prisma.riderInvite.create({ data: invite });
  },

  async findRiderInviteByTokenHash(tokenHash: string) {
    return prisma.riderInvite.findUnique({
      where: { tokenHash },
      include: { hub: { select: { name: true } } },
    });
  },

  async markRiderInviteAccepted(client: DbClient, inviteId: string): Promise<boolean> {
    const { count } = await client.riderInvite.updateMany({
      where: { id: inviteId, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    return count > 0;
  },

  async findActiveHub(hubId: string) {
    return prisma.hub.findFirst({ where: { id: hubId, isActive: true }, select: { id: true } });
  },

  async listPendingRiderInvites() {
    return prisma.riderInvite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: { hub: { select: { name: true } } },
    });
  },

  async createRiderProfile(client: DbClient, rider: CreateRiderProfileInput) {
    return client.rider.create({ data: rider });
  },

  async listRiders(params: {
    hubId?: string;
    status?: RiderStatus;
    cursor?: string;
    limit: number;
  }): Promise<RiderRecord[]> {
    return prisma.rider.findMany({
      where: {
        ...(params.hubId ? { hubId: params.hubId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: riderWithUserAndHub,
    });
  },

  async findRiderById(riderId: string, client: DbClient = prisma): Promise<RiderRecord | null> {
    return client.rider.findUnique({ where: { id: riderId }, include: riderWithUserAndHub });
  },

  async findRiderByUserId(userId: string) {
    return prisma.rider.findUnique({
      where: { userId },
      select: { id: true, hubId: true, status: true },
    });
  },

  async recordRiderIdentityCheck(
    riderId: string,
    check: {
      documentType: IdentityDocumentType;
      documentLast4: string;
      verifiedById: string;
    },
  ): Promise<RiderRecord> {
    return prisma.rider.update({
      where: { id: riderId },
      data: {
        identityDocumentType: check.documentType,
        identityDocumentLast4: check.documentLast4,
        identityVerifiedAt: new Date(),
        identityVerifiedById: check.verifiedById,
      },
      include: riderWithUserAndHub,
    });
  },

  async setRiderStatus(
    client: DbClient,
    riderId: string,
    status: RiderStatus,
  ): Promise<RiderRecord> {
    return client.rider.update({
      where: { id: riderId },
      data: { status },
      include: riderWithUserAndHub,
    });
  },

  async updateRiderVehicle(
    riderId: string,
    vehicle: { vehicleType: string | null; vehicleNumber: string | null },
  ): Promise<RiderRecord> {
    return prisma.rider.update({
      where: { id: riderId },
      data: vehicle,
      include: riderWithUserAndHub,
    });
  },

  async releaseOpenTasksForRider(client: DbClient, riderId: string): Promise<void> {
    const openTasks = { riderId, status: { in: OPEN_TASK_STATUSES } };
    await client.riderTaskStop.updateMany({
      where: { isActive: true, riderTask: openTasks },
      data: { isActive: false },
    });
    await client.riderTask.updateMany({
      where: openTasks,
      data: { status: RiderTaskStatus.CANCELLED },
    });
  },
};
