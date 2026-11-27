import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { DbClient } from "#types/db.types.js";

import { CLOSED_GROUP_STATUSES } from "./cancellation-request.constants.js";

const requestedGroupWhere = {
  cancellationRequestedAt: { not: null },
  status: { notIn: CLOSED_GROUP_STATUSES },
} satisfies Prisma.OrderFulfilmentGroupWhereInput;

const requestViewSelect = {
  id: true,
  orderId: true,
  brandId: true,
  status: true,
  fulfilmentMode: true,
  pickupStatus: true,
  cancellationRequestedAt: true,
  cancellationReason: true,
  brand: { select: { name: true, email: true } },
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      qty: true,
      refundedQty: true,
      unitPrice: true,
      product: { select: { name: true } },
      size: { select: { label: true } },
    },
  },
} satisfies Prisma.OrderFulfilmentGroupSelect;

export type CancellationRequestRecord = Prisma.OrderFulfilmentGroupGetPayload<{
  select: typeof requestViewSelect;
}>;

export const orderCancellationRequestRepository = {
  async listPending(params: {
    cursor?: string;
    limit: number;
  }): Promise<CancellationRequestRecord[]> {
    return prisma.orderFulfilmentGroup.findMany({
      where: requestedGroupWhere,
      orderBy: [{ cancellationRequestedAt: "asc" }, { id: "asc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      select: requestViewSelect,
    });
  },

  async findPending(client: DbClient, groupId: string): Promise<CancellationRequestRecord | null> {
    return client.orderFulfilmentGroup.findFirst({
      where: { id: groupId, ...requestedGroupWhere },
      select: requestViewSelect,
    });
  },

  async groupExists(client: DbClient, groupId: string): Promise<boolean> {
    const matchingGroups = await client.orderFulfilmentGroup.count({ where: { id: groupId } });
    return matchingGroups > 0;
  },

  async clearRequest(client: DbClient, groupId: string): Promise<boolean> {
    const { count } = await client.orderFulfilmentGroup.updateMany({
      where: { id: groupId, ...requestedGroupWhere },
      data: { cancellationRequestedAt: null },
    });
    return count > 0;
  },
};
