import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { BrandUnavailableRequestStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

const requestViewInclude = {
  orderItem: {
    select: {
      orderId: true,
      unitPrice: true,
      product: { select: { name: true } },
      size: { select: { label: true } },
    },
  },
  brand: { select: { name: true } },
} satisfies Prisma.BrandUnavailableRequestInclude;

export type UnavailableRequestRecord = Prisma.BrandUnavailableRequestGetPayload<{
  include: typeof requestViewInclude;
}>;

export const orderUnavailableItemRepository = {
  async findBrandGroupWithItems(groupId: string, brandId: string) {
    return prisma.orderFulfilmentGroup.findFirst({
      where: { id: groupId, brandId },
      select: {
        id: true,
        orderId: true,
        fulfilmentMode: true,
        status: true,
        pickupStatus: true,
        items: { select: { id: true, qty: true, refundedQty: true } },
      },
    });
  },

  async createRequests(
    client: DbClient,
    requests: {
      fulfilmentGroupId: string;
      orderItemId: string;
      brandId: string;
      qty: number;
      reason: string;
      requestedById: string;
    }[],
  ): Promise<void> {
    await client.brandUnavailableRequest.createMany({ data: requests });
  },

  async listForGroup(groupId: string): Promise<UnavailableRequestRecord[]> {
    return prisma.brandUnavailableRequest.findMany({
      where: { fulfilmentGroupId: groupId },
      orderBy: { createdAt: "desc" },
      include: requestViewInclude,
    });
  },

  async listForStaff(params: {
    status: BrandUnavailableRequestStatus;
    cursor?: string;
    limit: number;
  }): Promise<UnavailableRequestRecord[]> {
    return prisma.brandUnavailableRequest.findMany({
      where: { status: params.status },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: requestViewInclude,
    });
  },

  async findRequest(client: DbClient, requestId: string): Promise<UnavailableRequestRecord | null> {
    return client.brandUnavailableRequest.findUnique({
      where: { id: requestId },
      include: requestViewInclude,
    });
  },

  async decideRequest(
    client: DbClient,
    requestId: string,
    decision: {
      status: BrandUnavailableRequestStatus;
      decidedById: string;
      decisionNote?: string;
      refundId?: string;
    },
  ): Promise<boolean> {
    const { count } = await client.brandUnavailableRequest.updateMany({
      where: { id: requestId, status: BrandUnavailableRequestStatus.PENDING },
      data: { ...decision, decidedAt: new Date() },
    });
    return count > 0;
  },
};
