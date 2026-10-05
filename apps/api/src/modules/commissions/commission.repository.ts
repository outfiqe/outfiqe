import { prisma } from "#db/prisma.js";
import {
  type CommissionScope,
  CommissionStatus,
  FulfilmentStatus,
  PaymentStatus,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type {
  AvailableLedgerRow,
  CommissionTierRecord,
  CommissionTierRow,
  CreateCommissionTierInput,
  CreatePendingCommissionInput,
  UpdateCommissionTierInput,
} from "./commission.types.js";

const tierRowSelect = {
  id: true,
  scope: true,
  minPrice: true,
  maxPrice: true,
  amount: true,
  sortOrder: true,
} as const;

const ledgerRowInclude = {
  orderItem: {
    select: {
      product: {
        select: { name: true, imageUrl: true, brand: { select: { name: true } } },
      },
    },
  },
} as const;

const NO_ROWS = 0;

const sumAmountsByStatus = (
  grouped: { status: CommissionStatus; _sum: { amount: number | null } }[],
): Partial<Record<CommissionStatus, number>> => {
  const sums: Partial<Record<CommissionStatus, number>> = {};
  for (const { status, _sum } of grouped) {
    sums[status] = _sum.amount ?? NO_ROWS;
  }
  return sums;
};

export const commissionRepository = {
  async findTierForPrice(
    price: number,
    scope: CommissionScope,
  ): Promise<CommissionTierRecord | null> {
    return prisma.commissionTier.findFirst({
      where: {
        scope,
        minPrice: { lte: price },
        OR: [{ maxPrice: null }, { maxPrice: { gte: price } }],
      },
      orderBy: { minPrice: "desc" },
    });
  },

  async createPending(client: DbClient, input: CreatePendingCommissionInput): Promise<void> {
    await client.creatorCommission.create({ data: input });
  },

  async findApprovableIds(deliveredBefore: Date): Promise<string[]> {
    const rows = await prisma.creatorCommission.findMany({
      where: {
        status: CommissionStatus.PENDING,
        orderItem: {
          order: {
            fulfilmentStatus: FulfilmentStatus.DELIVERED,
            deliveredAt: { lte: deliveredBefore },
          },
        },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async findVoidableForCancelledIds(): Promise<string[]> {
    const rows = await prisma.creatorCommission.findMany({
      where: {
        status: CommissionStatus.PENDING,
        orderItem: { order: { fulfilmentStatus: FulfilmentStatus.CANCELLED } },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async findVoidableForFailedPaymentIds(): Promise<string[]> {
    const rows = await prisma.creatorCommission.findMany({
      where: {
        status: CommissionStatus.PENDING,
        orderItem: {
          order: { paymentStatus: { in: [PaymentStatus.FAILED, PaymentStatus.REFUNDED] } },
        },
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  async approve(id: string): Promise<boolean> {
    const now = new Date();
    const result = await prisma.creatorCommission.updateMany({
      where: { id, status: CommissionStatus.PENDING },
      data: { status: CommissionStatus.AVAILABLE, approvedAt: now, availableAt: now },
    });
    return result.count > 0;
  },

  async void(id: string, voidedReason: string): Promise<boolean> {
    const result = await prisma.creatorCommission.updateMany({
      where: { id, status: CommissionStatus.PENDING },
      data: { status: CommissionStatus.VOIDED, voidedReason },
    });
    return result.count > 0;
  },

  async voidForOrder(client: DbClient, orderId: string, voidedReason: string): Promise<number> {
    const result = await client.creatorCommission.updateMany({
      where: {
        orderItem: { orderId },
        status: {
          in: [CommissionStatus.PENDING, CommissionStatus.APPROVED, CommissionStatus.AVAILABLE],
        },
      },
      data: { status: CommissionStatus.VOIDED, voidedReason },
    });
    return result.count;
  },

  async countPaidForOrder(client: DbClient, orderId: string): Promise<number> {
    return client.creatorCommission.count({
      where: { orderItem: { orderId }, status: CommissionStatus.PAID },
    });
  },

  async listForCreator(creatorId: string, params: { cursor?: string; limit: number }) {
    return prisma.creatorCommission.findMany({
      where: { creatorId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: ledgerRowInclude,
    });
  },

  async listForBrand(recipientBrandId: string, params: { cursor?: string; limit: number }) {
    return prisma.creatorCommission.findMany({
      where: { recipientBrandId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: ledgerRowInclude,
    });
  },

  async sumByStatusForCreator(
    creatorId: string,
  ): Promise<Partial<Record<CommissionStatus, number>>> {
    const grouped = await prisma.creatorCommission.groupBy({
      by: ["status"],
      where: { creatorId },
      _sum: { amount: true },
    });
    return sumAmountsByStatus(grouped);
  },

  async sumByStatusForBrand(
    recipientBrandId: string,
  ): Promise<Partial<Record<CommissionStatus, number>>> {
    const grouped = await prisma.creatorCommission.groupBy({
      by: ["status"],
      where: { recipientBrandId },
      _sum: { amount: true },
    });
    return sumAmountsByStatus(grouped);
  },

  async hasAnyForPerson(creatorId: string): Promise<boolean> {
    const commission = await prisma.creatorCommission.findFirst({
      where: { creatorId },
      select: { id: true },
    });
    return commission !== null;
  },

  async listAvailableForBrand(
    client: DbClient,
    recipientBrandId: string,
  ): Promise<AvailableLedgerRow[]> {
    return client.creatorCommission.findMany({
      where: { recipientBrandId, status: CommissionStatus.AVAILABLE },
      orderBy: { createdAt: "asc" },
      select: { id: true, amount: true, createdAt: true },
    });
  },

  async markAvailableAsPaid(client: DbClient, ids: string[]): Promise<number> {
    if (ids.length === NO_ROWS) return NO_ROWS;
    const result = await client.creatorCommission.updateMany({
      where: { id: { in: ids }, status: CommissionStatus.AVAILABLE },
      data: { status: CommissionStatus.PAID, paidAt: new Date() },
    });
    return result.count;
  },

  async listTiers(scope: CommissionScope): Promise<CommissionTierRow[]> {
    return prisma.commissionTier.findMany({
      where: { scope },
      orderBy: [{ sortOrder: "asc" }, { minPrice: "asc" }],
      select: tierRowSelect,
    });
  },

  async findTierById(id: string): Promise<CommissionTierRow | null> {
    return prisma.commissionTier.findUnique({ where: { id }, select: tierRowSelect });
  },

  async createTier(
    input: CreateCommissionTierInput,
    scope: CommissionScope,
  ): Promise<CommissionTierRow> {
    return prisma.commissionTier.create({ data: { ...input, scope }, select: tierRowSelect });
  },

  async updateTier(id: string, input: UpdateCommissionTierInput): Promise<CommissionTierRow> {
    return prisma.commissionTier.update({ where: { id }, data: input, select: tierRowSelect });
  },

  async deleteTier(id: string): Promise<void> {
    await prisma.commissionTier.delete({ where: { id } });
  },

  async listAllAdmin(params: { status?: CommissionStatus; cursor?: string; limit: number }) {
    return prisma.creatorCommission.findMany({
      where: params.status ? { status: params.status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        creator: { select: { name: true } },
        recipientBrand: { select: { name: true } },
        orderItem: {
          select: { product: { select: { name: true, brand: { select: { name: true } } } } },
        },
      },
    });
  },

  async adminVoid(id: string, voidedReason: string): Promise<boolean> {
    const result = await prisma.creatorCommission.updateMany({
      where: {
        id,
        status: {
          in: [CommissionStatus.PENDING, CommissionStatus.APPROVED, CommissionStatus.AVAILABLE],
        },
      },
      data: { status: CommissionStatus.VOIDED, voidedReason },
    });
    return result.count > 0;
  },

  async markPaid(id: string): Promise<boolean> {
    const result = await prisma.creatorCommission.updateMany({
      where: { id, status: CommissionStatus.AVAILABLE },
      data: { status: CommissionStatus.PAID, paidAt: new Date() },
    });
    return result.count > 0;
  },

  async listAvailableForCreator(
    client: DbClient,
    creatorId: string,
  ): Promise<AvailableLedgerRow[]> {
    return client.creatorCommission.findMany({
      where: { creatorId, status: CommissionStatus.AVAILABLE },
      orderBy: { createdAt: "asc" },
      select: { id: true, amount: true, createdAt: true },
    });
  },
};
