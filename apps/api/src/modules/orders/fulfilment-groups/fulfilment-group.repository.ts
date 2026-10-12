import { prisma } from "#db/prisma.js";
import { FulfilmentStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { OrderFulfilmentRollup } from "../order.types.js";

export const orderFulfilmentGroupRepository = {
  async returnFulfilmentGroupsForOrder(
    client: DbClient,
    orderId: string,
    returnedAt: Date,
  ): Promise<void> {
    await client.orderFulfilmentGroup.updateMany({
      where: { orderId, status: { not: FulfilmentStatus.CANCELLED } },
      data: { status: FulfilmentStatus.RETURNED, returnedAt },
    });
  },

  async createFulfilmentGroups(client: DbClient, orderId: string, brandIds: string[]) {
    return client.orderFulfilmentGroup.createManyAndReturn({
      data: brandIds.map((brandId) => ({ orderId, brandId })),
      select: { id: true, brandId: true },
    });
  },

  async assignItemsToFulfilmentGroup(
    client: DbClient,
    fulfilmentGroupId: string,
    orderItemIds: string[],
  ): Promise<void> {
    await client.orderItem.updateMany({
      where: { id: { in: orderItemIds } },
      data: { fulfilmentGroupId },
    });
  },

  async listFulfilmentGroupStatuses(
    client: DbClient,
    orderId: string,
  ): Promise<FulfilmentStatus[]> {
    const groups = await client.orderFulfilmentGroup.findMany({
      where: { orderId },
      select: { status: true },
    });
    return groups.map((group) => group.status);
  },

  async setOrderFulfilmentRollup(
    client: DbClient,
    orderId: string,
    rollup: OrderFulfilmentRollup,
  ): Promise<void> {
    await client.order.update({
      where: { id: orderId },
      data: {
        fulfilmentStatus: rollup.fulfilmentStatus,
        fulfilmentSummary: rollup.fulfilmentSummary,
      },
    });

    if (rollup.fulfilmentStatus === FulfilmentStatus.DELIVERED) {
      await client.order.updateMany({
        where: { id: orderId, deliveredAt: null },
        data: { deliveredAt: new Date() },
      });
    }
  },

  async listBrandsWithStaleShippedShipments(
    shippedBefore: Date,
  ): Promise<{ brandId: string; brandName: string; brandEmail: string; shipmentCount: number }[]> {
    const grouped = await prisma.orderFulfilmentGroup.groupBy({
      by: ["brandId"],
      where: { status: FulfilmentStatus.SHIPPED, shippedAt: { lte: shippedBefore } },
      _count: { _all: true },
    });
    if (grouped.length === 0) return [];

    const brands = await prisma.brand.findMany({
      where: { id: { in: grouped.map((row) => row.brandId) } },
      select: { id: true, name: true, email: true },
    });
    const brandById = new Map(brands.map((brand) => [brand.id, brand]));

    return grouped.flatMap((row) => {
      const brand = brandById.get(row.brandId);
      if (!brand) return [];
      return [
        {
          brandId: row.brandId,
          brandName: brand.name,
          brandEmail: brand.email,
          shipmentCount: row._count._all,
        },
      ];
    });
  },

  async cancelFulfilmentGroupsForOrder(
    client: DbClient,
    orderId: string,
    cancelledAt: Date,
  ): Promise<void> {
    await client.orderFulfilmentGroup.updateMany({
      where: { orderId, status: { not: FulfilmentStatus.CANCELLED } },
      data: { status: FulfilmentStatus.CANCELLED, cancelledAt },
    });
  },

  async advanceActiveFulfilmentGroupsForOrder(
    client: DbClient,
    orderId: string,
    status: FulfilmentStatus,
    at: Date,
  ): Promise<void> {
    const reachedTimestamp: Partial<Record<"packedAt" | "shippedAt" | "deliveredAt", Date>> = {};
    if (status === FulfilmentStatus.PACKED) reachedTimestamp.packedAt = at;
    if (status === FulfilmentStatus.SHIPPED) reachedTimestamp.shippedAt = at;
    if (status === FulfilmentStatus.DELIVERED) reachedTimestamp.deliveredAt = at;

    await client.orderFulfilmentGroup.updateMany({
      where: { orderId, status: { not: FulfilmentStatus.CANCELLED } },
      data: { status, ...reachedTimestamp },
    });
  },

  async listFulfilmentGroupsForBrand(
    brandId: string,
    params: { status?: FulfilmentStatus; cursor?: string; limit: number },
  ) {
    return prisma.orderFulfilmentGroup.findMany({
      where: { brandId, ...(params.status ? { status: params.status } : {}) },
      orderBy: [{ order: { createdAt: "desc" } }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        items: {
          select: { qty: true, product: { select: { name: true, imageUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
        order: {
          select: {
            createdAt: true,
            city: true,
            paymentStatus: true,
            fulfilmentSummary: true,
          },
        },
      },
    });
  },

  async findFulfilmentGroupForBrand(groupId: string, brandId: string) {
    return prisma.orderFulfilmentGroup.findFirst({
      where: { id: groupId, brandId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            product: { select: { name: true, imageUrl: true } },
            size: { select: { label: true } },
            brandPayout: {
              select: {
                orderItemId: true,
                grossAmount: true,
                platformFee: true,
                gatewayFee: true,
                netAmount: true,
                status: true,
              },
            },
          },
        },
        order: {
          select: {
            createdAt: true,
            fullName: true,
            phone: true,
            address: true,
            city: true,
            landmark: true,
            paymentStatus: true,
            fulfilmentSummary: true,
          },
        },
      },
    });
  },

  async findFulfilmentGroupStatusForBrand(groupId: string, brandId: string) {
    return prisma.orderFulfilmentGroup.findFirst({
      where: { id: groupId, brandId },
      select: {
        status: true,
        order: { select: { id: true, userId: true, fulfilmentStatus: true } },
      },
    });
  },

  async advanceFulfilmentGroup(
    groupId: string,
    brandId: string,
    fromStatuses: FulfilmentStatus[],
    toStatus: FulfilmentStatus,
    patch: { carrier?: string; trackingNumber?: string; at: Date },
  ): Promise<{ orderId: string } | null> {
    const reachedTimestamp: Partial<Record<"packedAt" | "shippedAt" | "deliveredAt", Date>> = {};
    if (toStatus === FulfilmentStatus.PACKED) reachedTimestamp.packedAt = patch.at;
    if (toStatus === FulfilmentStatus.SHIPPED) reachedTimestamp.shippedAt = patch.at;
    if (toStatus === FulfilmentStatus.DELIVERED) reachedTimestamp.deliveredAt = patch.at;

    const updated = await prisma.orderFulfilmentGroup.updateMany({
      where: {
        id: groupId,
        brandId,
        status: { in: fromStatuses },
        cancellationRequestedAt: null,
      },
      data: {
        status: toStatus,
        ...reachedTimestamp,
        ...(patch.carrier ? { carrier: patch.carrier } : {}),
        ...(patch.trackingNumber ? { trackingNumber: patch.trackingNumber } : {}),
      },
    });
    if (updated.count === 0) return null;

    const group = await prisma.orderFulfilmentGroup.findUniqueOrThrow({
      where: { id: groupId },
      select: { orderId: true },
    });
    return { orderId: group.orderId };
  },

  async flagFulfilmentGroupCancellationRequest(
    groupId: string,
    brandId: string,
    reason: string,
    requestedAt: Date,
  ): Promise<boolean> {
    const updated = await prisma.orderFulfilmentGroup.updateMany({
      where: {
        id: groupId,
        brandId,
        status: { not: FulfilmentStatus.CANCELLED },
        cancellationRequestedAt: null,
      },
      data: { cancellationRequestedAt: requestedAt, cancellationReason: reason },
    });
    return updated.count > 0;
  },
};
