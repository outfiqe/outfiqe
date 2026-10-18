import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  BrandReturnStatus,
  PickupStatus,
  RiderStopDirection,
  RiderTaskStatus,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

export const OPEN_RIDER_TASK_STATUSES: RiderTaskStatus[] = [
  RiderTaskStatus.ASSIGNED,
  RiderTaskStatus.IN_PROGRESS,
];
const MAX_OPEN_TASKS_PER_RIDER = 50;

const waitingForCollectionWhere = (hubId: string): Prisma.OrderFulfilmentGroupWhereInput => ({
  hubId,
  pickupStatus: PickupStatus.READY_FOR_PICKUP,
  riderTaskStops: { none: { isActive: true, direction: RiderStopDirection.COLLECT } },
});

const waitingToGoBackWhere = (hubId: string): Prisma.BrandReturnWhereInput => ({
  hubId,
  status: BrandReturnStatus.AT_HUB,
});

const returnStopSelect = {
  id: true,
  source: true,
  fulfilmentGroup: { select: { orderId: true, pickupLocationId: true } },
  lines: { select: { resellableQty: true, damagedQty: true } },
} satisfies Prisma.BrandReturnSelect;

export type BrandReturnForRoundRecord = Prisma.BrandReturnGetPayload<{
  select: typeof returnStopSelect;
}>;

const boardLocationInclude = (hubId: string) =>
  ({
    brand: { select: { name: true } },
    fulfilmentGroups: {
      where: waitingForCollectionWhere(hubId),
      orderBy: { readyForPickupAt: "asc" },
      select: {
        id: true,
        orderId: true,
        readyForPickupAt: true,
        _count: { select: { items: true } },
      },
    },
  }) satisfies Prisma.BrandPickupLocationInclude;

export type PickupBoardLocationRecord = Prisma.BrandPickupLocationGetPayload<{
  include: ReturnType<typeof boardLocationInclude>;
}>;

const taskSummaryInclude = {
  rider: { select: { user: { select: { name: true } } } },
  brand: { select: { name: true } },
  pickupLocation: { select: { label: true } },
  stops: { where: { isActive: true }, select: { scannedAt: true } },
} satisfies Prisma.RiderTaskInclude;

export type RiderTaskSummaryRecord = Prisma.RiderTaskGetPayload<{
  include: typeof taskSummaryInclude;
}>;

const riderTaskDetailInclude = {
  brand: { select: { name: true } },
  pickupLocation: {
    select: {
      label: true,
      contactName: true,
      contactPhoneE164: true,
      address: true,
      landmark: true,
      city: true,
      latitude: true,
      longitude: true,
      openingNote: true,
    },
  },
  stops: {
    where: { isActive: true },
    orderBy: { id: "asc" },
    select: {
      id: true,
      scannedAt: true,
      direction: true,
      brandReturn: { select: returnStopSelect },
      fulfilmentGroup: {
        select: {
          id: true,
          orderId: true,
          bagTag: { select: { code: true } },
          _count: { select: { items: true } },
        },
      },
    },
  },
} satisfies Prisma.RiderTaskInclude;

export type RiderTaskDetailRecord = Prisma.RiderTaskGetPayload<{
  include: typeof riderTaskDetailInclude;
}>;

export const logisticsRoundRepository = {
  async listPickupBoardLocations(params: {
    hubId: string;
    cursor?: string;
    limit: number;
  }): Promise<PickupBoardLocationRecord[]> {
    return prisma.brandPickupLocation.findMany({
      where: {
        OR: [
          { fulfilmentGroups: { some: waitingForCollectionWhere(params.hubId) } },
          {
            fulfilmentGroups: {
              some: { brandReturns: { some: waitingToGoBackWhere(params.hubId) } },
            },
          },
        ],
      },
      orderBy: { id: "asc" },
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: boardLocationInclude(params.hubId),
    });
  },

  async listReturnsWaitingAtLocations(
    hubId: string,
    pickupLocationIds: readonly string[],
  ): Promise<BrandReturnForRoundRecord[]> {
    return prisma.brandReturn.findMany({
      where: {
        ...waitingToGoBackWhere(hubId),
        fulfilmentGroup: { pickupLocationId: { in: [...pickupLocationIds] } },
      },
      orderBy: { createdAt: "asc" },
      select: returnStopSelect,
    });
  },

  async listReturnsToCarry(
    client: DbClient,
    params: { hubId: string; pickupLocationId: string; brandReturnIds: string[] },
  ) {
    return client.brandReturn.findMany({
      where: {
        ...waitingToGoBackWhere(params.hubId),
        id: { in: params.brandReturnIds },
        fulfilmentGroup: { pickupLocationId: params.pickupLocationId },
      },
      select: { id: true, fulfilmentGroupId: true },
    });
  },

  async moveReturnsOnRound(client: DbClient, brandReturnIds: string[]): Promise<number> {
    const { count } = await client.brandReturn.updateMany({
      where: { id: { in: brandReturnIds }, status: BrandReturnStatus.AT_HUB },
      data: { status: BrandReturnStatus.ON_ROUND },
    });
    return count;
  },

  async findActiveReturnStop(client: DbClient, taskId: string, brandReturnId: string) {
    return client.riderTaskStop.findFirst({
      where: {
        riderTaskId: taskId,
        isActive: true,
        direction: RiderStopDirection.RETURN,
        brandReturnId,
      },
      select: {
        id: true,
        scannedAt: true,
        fulfilmentGroupId: true,
        brandReturn: { select: { source: true } },
      },
    });
  },

  async markReturnDroppedOff(
    client: DbClient,
    brandReturnId: string,
    droppedOffAt: Date,
  ): Promise<boolean> {
    const { count } = await client.brandReturn.updateMany({
      where: { id: brandReturnId, status: BrandReturnStatus.ON_ROUND },
      data: { status: BrandReturnStatus.DROPPED_OFF, droppedOffAt },
    });
    return count > 0;
  },

  async findPickupLocationBrand(pickupLocationId: string) {
    return prisma.brandPickupLocation.findUnique({
      where: { id: pickupLocationId },
      select: { brandId: true },
    });
  },

  async countCollectableGroups(
    client: DbClient,
    params: { hubId: string; pickupLocationId: string; fulfilmentGroupIds: string[] },
  ): Promise<number> {
    return client.orderFulfilmentGroup.count({
      where: {
        ...waitingForCollectionWhere(params.hubId),
        id: { in: params.fulfilmentGroupIds },
        pickupLocationId: params.pickupLocationId,
      },
    });
  },

  async createRiderTask(
    client: DbClient,
    task: {
      riderId: string;
      hubId: string;
      brandId: string;
      pickupLocationId: string;
      roundStartsAt: Date;
      assignedById: string;
      fulfilmentGroupIds: string[];
      returnsToCarry: { id: string; fulfilmentGroupId: string }[];
    },
  ) {
    const { fulfilmentGroupIds, returnsToCarry, ...taskFields } = task;
    return client.riderTask.create({
      data: {
        ...taskFields,
        stops: {
          createMany: {
            data: [
              ...fulfilmentGroupIds.map((fulfilmentGroupId) => ({
                fulfilmentGroupId,
                direction: RiderStopDirection.COLLECT,
              })),
              ...returnsToCarry.map(({ id, fulfilmentGroupId }) => ({
                fulfilmentGroupId,
                brandReturnId: id,
                direction: RiderStopDirection.RETURN,
              })),
            ],
          },
        },
      },
      select: { id: true },
    });
  },

  async listRiderTasks(params: {
    hubId: string;
    riderId?: string;
    status?: RiderTaskStatus;
    cursor?: string;
    limit: number;
  }): Promise<RiderTaskSummaryRecord[]> {
    return prisma.riderTask.findMany({
      where: {
        hubId: params.hubId,
        ...(params.riderId ? { riderId: params.riderId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      orderBy: [{ roundStartsAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: taskSummaryInclude,
    });
  },

  async findRiderTaskSummary(
    client: DbClient,
    taskId: string,
  ): Promise<RiderTaskSummaryRecord | null> {
    return client.riderTask.findUnique({ where: { id: taskId }, include: taskSummaryInclude });
  },

  async listOpenTasksForRider(riderId: string): Promise<RiderTaskDetailRecord[]> {
    return prisma.riderTask.findMany({
      where: { riderId, status: { in: OPEN_RIDER_TASK_STATUSES } },
      orderBy: [{ roundStartsAt: "asc" }, { id: "asc" }],
      take: MAX_OPEN_TASKS_PER_RIDER,
      include: riderTaskDetailInclude,
    });
  },

  async findRiderTaskDetail(
    client: DbClient,
    taskId: string,
    riderId: string,
  ): Promise<RiderTaskDetailRecord | null> {
    return client.riderTask.findFirst({
      where: { id: taskId, riderId },
      include: riderTaskDetailInclude,
    });
  },

  async findActiveCollectStopByPickupCode(client: DbClient, taskId: string, pickupCode: string) {
    return client.riderTaskStop.findFirst({
      where: {
        riderTaskId: taskId,
        isActive: true,
        direction: RiderStopDirection.COLLECT,
        fulfilmentGroup: { pickupCode },
      },
      select: {
        id: true,
        scannedAt: true,
        fulfilmentGroupId: true,
        fulfilmentGroup: {
          select: {
            pickupStatus: true,
            pickupStatusChangedAt: true,
            bagTag: { select: { code: true } },
          },
        },
      },
    });
  },

  async markStopScanned(client: DbClient, stopId: string, scannedAt: Date): Promise<boolean> {
    const { count } = await client.riderTaskStop.updateMany({
      where: { id: stopId, isActive: true, scannedAt: null },
      data: { scannedAt },
    });
    return count > 0;
  },

  async countStops(
    client: DbClient,
    taskId: string,
  ): Promise<{ activeStopCount: number; scannedStopCount: number }> {
    const [activeStopCount, scannedStopCount] = await Promise.all([
      client.riderTaskStop.count({ where: { riderTaskId: taskId, isActive: true } }),
      client.riderTaskStop.count({
        where: { riderTaskId: taskId, isActive: true, scannedAt: { not: null } },
      }),
    ]);
    return { activeStopCount, scannedStopCount };
  },

  async listUnscannedStopGroupIds(client: DbClient, taskId: string): Promise<string[]> {
    const unscannedStops = await client.riderTaskStop.findMany({
      where: {
        riderTaskId: taskId,
        isActive: true,
        scannedAt: null,
        direction: RiderStopDirection.COLLECT,
      },
      select: { fulfilmentGroupId: true },
    });
    return unscannedStops.map(({ fulfilmentGroupId }) => fulfilmentGroupId);
  },

  async releaseUnscannedStops(client: DbClient, taskId: string): Promise<void> {
    await client.brandReturn.updateMany({
      where: {
        status: BrandReturnStatus.ON_ROUND,
        stops: { some: { riderTaskId: taskId, isActive: true, scannedAt: null } },
      },
      data: { status: BrandReturnStatus.AT_HUB },
    });
    await client.riderTaskStop.updateMany({
      where: { riderTaskId: taskId, isActive: true, scannedAt: null },
      data: { isActive: false },
    });
  },

  async moveTaskStatus(
    client: DbClient,
    taskId: string,
    move: {
      fromStatuses: RiderTaskStatus[];
      toStatus: RiderTaskStatus;
      completedAt?: Date;
      wastedReason?: string;
    },
  ): Promise<boolean> {
    const { fromStatuses, toStatus, ...extraFields } = move;
    const { count } = await client.riderTask.updateMany({
      where: { id: taskId, status: { in: fromStatuses } },
      data: { status: toStatus, ...extraFields },
    });
    return count > 0;
  },
};
