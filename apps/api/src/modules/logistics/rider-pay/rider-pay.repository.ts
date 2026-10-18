import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  RiderEarningStatus,
  RiderEmploymentType,
  type RiderTaskStatus,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

const PAGE_LOOKAHEAD = 1;
const NO_EARNINGS = 0;
const NO_AMOUNT = 0;

const VOIDABLE_EARNING_STATUSES = [RiderEarningStatus.PENDING, RiderEarningStatus.AVAILABLE];

const payRateSelect = {
  id: true,
  countryCode: true,
  currency: true,
  employmentType: true,
  visitAmount: true,
  extraStopAmount: true,
  wastedVisitAmount: true,
  effectiveFrom: true,
  isActive: true,
  createdAt: true,
  createdBy: { select: { name: true } },
} satisfies Prisma.RiderPayRateSelect;

export type RiderPayRateRecord = Prisma.RiderPayRateGetPayload<{ select: typeof payRateSelect }>;

const earningSelect = {
  id: true,
  riderTaskId: true,
  kind: true,
  currency: true,
  stopCount: true,
  amount: true,
  status: true,
  earnedAt: true,
  releasesAt: true,
  availableAt: true,
  withdrawnAt: true,
  voidedAt: true,
  voidReason: true,
  riderTask: {
    select: { brand: { select: { name: true } }, pickupLocation: { select: { label: true } } },
  },
  rider: { select: { id: true, user: { select: { name: true } } } },
} satisfies Prisma.RiderEarningSelect;

export type RiderEarningRecord = Prisma.RiderEarningGetPayload<{ select: typeof earningSelect }>;

export type TaskToPay = {
  id: string;
  riderId: string;
  status: RiderTaskStatus;
  completedAt: Date | null;
  rider: { employmentType: RiderEmploymentType };
  hub: { countryCode: string };
};

export const logisticsRiderPayRepository = {
  async findTaskToPay(client: DbClient, taskId: string): Promise<TaskToPay | null> {
    return client.riderTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        riderId: true,
        status: true,
        completedAt: true,
        rider: { select: { employmentType: true } },
        hub: { select: { countryCode: true } },
      },
    });
  },

  async countScannedStops(client: DbClient, taskId: string): Promise<number> {
    return client.riderTaskStop.count({
      where: { riderTaskId: taskId, isActive: true, scannedAt: { not: null } },
    });
  },

  async findRateInEffect(
    client: DbClient,
    {
      countryCode,
      employmentType,
      at,
    }: { countryCode: string; employmentType: RiderEmploymentType; at: Date },
  ) {
    return client.riderPayRate.findFirst({
      where: { countryCode, employmentType, isActive: true, effectiveFrom: { lte: at } },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
      select: payRateSelect,
    });
  },

  async insertEarning(
    client: DbClient,
    earning: Prisma.RiderEarningUncheckedCreateInput,
  ): Promise<boolean> {
    const { count } = await client.riderEarning.createMany({
      data: [earning],
      skipDuplicates: true,
    });
    return count > NO_EARNINGS;
  },

  async releaseDueEarnings(releasedBefore: Date): Promise<number> {
    const { count } = await prisma.riderEarning.updateMany({
      where: { status: RiderEarningStatus.PENDING, releasesAt: { lte: releasedBefore } },
      data: { status: RiderEarningStatus.AVAILABLE, availableAt: releasedBefore },
    });
    return count;
  },

  async listRates(countryCode: string): Promise<RiderPayRateRecord[]> {
    return prisma.riderPayRate.findMany({
      where: { countryCode },
      orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
      select: payRateSelect,
    });
  },

  async createRate(data: Prisma.RiderPayRateUncheckedCreateInput): Promise<RiderPayRateRecord> {
    return prisma.riderPayRate.create({ data, select: payRateSelect });
  },

  async deactivateRate(rateId: string): Promise<RiderPayRateRecord | null> {
    const { count } = await prisma.riderPayRate.updateMany({
      where: { id: rateId, isActive: true },
      data: { isActive: false },
    });
    if (count === NO_EARNINGS) return null;
    return prisma.riderPayRate.findUnique({ where: { id: rateId }, select: payRateSelect });
  },

  async findRate(rateId: string) {
    return prisma.riderPayRate.findUnique({ where: { id: rateId }, select: { id: true } });
  },

  async listEarnings(params: {
    riderId?: string;
    status?: RiderEarningStatus;
    cursor?: string;
    limit: number;
  }): Promise<RiderEarningRecord[]> {
    return prisma.riderEarning.findMany({
      where: {
        ...(params.riderId ? { riderId: params.riderId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      orderBy: [{ earnedAt: "desc" }, { id: "desc" }],
      take: params.limit + PAGE_LOOKAHEAD,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: PAGE_LOOKAHEAD } : {}),
      select: earningSelect,
    });
  },

  async sumEarningsByStatus(riderId: string): Promise<Partial<Record<RiderEarningStatus, number>>> {
    const sums = await prisma.riderEarning.groupBy({
      by: ["status"],
      where: { riderId },
      _sum: { amount: true },
    });
    return Object.fromEntries(sums.map(({ status, _sum }) => [status, _sum.amount ?? NO_AMOUNT]));
  },

  async sumAvailableForUser(userId: string): Promise<number> {
    const { _sum } = await prisma.riderEarning.aggregate({
      where: { status: RiderEarningStatus.AVAILABLE, rider: { userId } },
      _sum: { amount: true },
    });
    return _sum.amount ?? NO_AMOUNT;
  },

  async listAvailableForUser(
    client: DbClient,
    userId: string,
  ): Promise<{ id: string; amount: number; createdAt: Date }[]> {
    return client.riderEarning.findMany({
      where: { status: RiderEarningStatus.AVAILABLE, rider: { userId } },
      orderBy: { earnedAt: "asc" },
      select: { id: true, amount: true, createdAt: true },
    });
  },

  async markAvailableAsWithdrawn(client: DbClient, earningIds: string[]): Promise<number> {
    if (earningIds.length === NO_EARNINGS) return NO_EARNINGS;
    const { count } = await client.riderEarning.updateMany({
      where: { id: { in: earningIds }, status: RiderEarningStatus.AVAILABLE },
      data: { status: RiderEarningStatus.WITHDRAWN, withdrawnAt: new Date() },
    });
    return count;
  },

  async voidEarning(
    earningId: string,
    { voidedById, voidReason }: { voidedById: string; voidReason: string },
  ): Promise<boolean> {
    const { count } = await prisma.riderEarning.updateMany({
      where: { id: earningId, status: { in: VOIDABLE_EARNING_STATUSES } },
      data: { status: RiderEarningStatus.VOIDED, voidedAt: new Date(), voidedById, voidReason },
    });
    return count > NO_EARNINGS;
  },

  async findEarning(earningId: string): Promise<RiderEarningRecord | null> {
    return prisma.riderEarning.findUnique({ where: { id: earningId }, select: earningSelect });
  },

  async findHubCountryCode(hubId: string): Promise<string> {
    const { countryCode } = await prisma.hub.findUniqueOrThrow({
      where: { id: hubId },
      select: { countryCode: true },
    });
    return countryCode;
  },

  async isContractorRider(userId: string): Promise<boolean> {
    const rider = await prisma.rider.findUnique({
      where: { userId },
      select: { employmentType: true },
    });
    return rider?.employmentType === RiderEmploymentType.CONTRACTOR;
  },
};
