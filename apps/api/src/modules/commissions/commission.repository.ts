import { prisma } from "#db/prisma.js";
import { CommissionStatus, FulfilmentStatus, PaymentStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type {
  CommissionTierAdminView,
  CommissionTierRecord,
  CreateCommissionTierInput,
  CreatePendingCommissionInput,
  UpdateCommissionTierInput,
} from "./commission.types.js";

export const commissionRepository = {
  async findTierForPrice(price: number): Promise<CommissionTierRecord | null> {
    return prisma.commissionTier.findFirst({
      where: {
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

  async listForCreator(creatorId: string, params: { cursor?: string; limit: number }) {
    return prisma.creatorCommission.findMany({
      where: { creatorId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        orderItem: {
          select: {
            product: {
              select: { name: true, imageUrl: true, brand: { select: { name: true } } },
            },
          },
        },
      },
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

    const sums: Partial<Record<CommissionStatus, number>> = {};
    for (const { status, _sum } of grouped) {
      sums[status] = _sum.amount ?? 0;
    }
    return sums;
  },

  async listTiers(): Promise<CommissionTierAdminView[]> {
    return prisma.commissionTier.findMany({ orderBy: [{ sortOrder: "asc" }, { minPrice: "asc" }] });
  },

  async findTierById(id: string): Promise<CommissionTierAdminView | null> {
    return prisma.commissionTier.findUnique({ where: { id } });
  },

  async createTier(input: CreateCommissionTierInput): Promise<CommissionTierAdminView> {
    return prisma.commissionTier.create({ data: input });
  },

  async updateTier(id: string, input: UpdateCommissionTierInput): Promise<CommissionTierAdminView> {
    return prisma.commissionTier.update({ where: { id }, data: input });
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
};
