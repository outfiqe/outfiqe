import { prisma } from "#db/prisma.js";
import { CommissionStatus, FulfilmentStatus, PaymentStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { CommissionTierRecord, CreatePendingCommissionInput } from "./commission.types.js";

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
};
