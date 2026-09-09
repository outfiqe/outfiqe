import { prisma } from "#db/prisma.js";
import {
  FulfilmentStatus,
  PaymentStatus,
  PaymentTransactionType,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { CreateOrderInput, OrderFulfilmentRollup } from "./order.types.js";

const withOrderItemDetails = {
  product: { select: { name: true, imageUrl: true, brand: { select: { name: true } } } },
  size: { select: { label: true } },
  attributedCreator: { select: { name: true } },
};

export const orderRepository = {
  async create(client: DbClient, input: CreateOrderInput) {
    const { items, paymentTransactionStatus, paymentMethod, ...orderFields } = input;
    return client.order.create({
      data: {
        ...orderFields,
        paymentMethod,
        items: { create: items },
        transactions: {
          create: [
            {
              provider: paymentMethod,
              type: PaymentTransactionType.PAYMENT,
              status: paymentTransactionStatus,
            },
          ],
        },
      },
      include: { items: { include: withOrderItemDetails } },
    });
  },

  async findByIdForUser(userId: string, orderId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: withOrderItemDetails },
        transactions: { orderBy: { createdAt: "asc" } },
      },
    });
  },

  async listForUser(userId: string, params: { cursor?: string; limit: number }) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { items: { include: withOrderItemDetails, take: 1, orderBy: { createdAt: "asc" } } },
    });
  },

  async listAllAdmin(params: { status?: FulfilmentStatus; cursor?: string; limit: number }) {
    return prisma.order.findMany({
      where: params.status ? { fulfilmentStatus: params.status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        items: { include: withOrderItemDetails, take: 1, orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true } },
      },
    });
  },

  async findByIdAdmin(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: withOrderItemDetails },
        transactions: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true } },
        fulfilmentGroups: {
          orderBy: { createdAt: "asc" },
          include: {
            brand: { select: { name: true } },
            items: { select: { product: { select: { name: true } } } },
          },
        },
      },
    });
  },

  async findForAdminAction(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        phone: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        fulfilmentStatus: true,
        items: { select: { sizeId: true, qty: true } },
      },
    });
  },

  async updateFulfilmentStatus(
    orderId: string,
    fromStatuses: FulfilmentStatus[],
    toStatus: FulfilmentStatus,
    deliveredAt?: Date,
  ): Promise<boolean> {
    const result = await prisma.order.updateMany({
      where: { id: orderId, fulfilmentStatus: { in: fromStatuses } },
      data: { fulfilmentStatus: toStatus, ...(deliveredAt ? { deliveredAt } : {}) },
    });
    return result.count > 0;
  },

  async markCancelled(
    client: DbClient,
    orderId: string,
    fromStatuses: FulfilmentStatus[],
  ): Promise<boolean> {
    const result = await client.order.updateMany({
      where: { id: orderId, fulfilmentStatus: { in: fromStatuses } },
      data: { fulfilmentStatus: FulfilmentStatus.CANCELLED },
    });
    return result.count > 0;
  },

  async markRefunded(client: DbClient, orderId: string): Promise<void> {
    await client.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });
  },

  async failUnsettledPayment(client: DbClient, orderId: string): Promise<void> {
    await client.order.updateMany({
      where: { id: orderId, paymentStatus: PaymentStatus.INITIATED },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
  },

  async markNeedsManualRefund(client: DbClient, orderId: string): Promise<void> {
    await client.order.update({
      where: { id: orderId },
      data: { needsManualRefund: true },
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
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
      where: { id: groupId, brandId, status: { in: fromStatuses } },
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

  async listItemsForBrand(brandId: string, params: { cursor?: string; limit: number }) {
    return prisma.orderItem.findMany({
      where: { product: { brandId } },
      orderBy: [{ order: { createdAt: "desc" } }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        product: { select: { name: true, imageUrl: true } },
        size: { select: { label: true } },
        order: {
          select: { id: true, createdAt: true, paymentStatus: true, fulfilmentStatus: true },
        },
      },
    });
  },
};
