import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { OrderRefundStatus, type RefundDestinationKind } from "#generated/prisma/enums.js";

const NOTHING_UPDATED = 0;

const destinationSelect = {
  kind: true,
  walletId: true,
  bankId: true,
  bank: { select: { name: true } },
  accountName: true,
  accountNumberCiphertext: true,
  accountNumberLast4: true,
  updatedAt: true,
} satisfies Prisma.OrderRefundDestinationSelect;

export type RefundDestinationRecord = Prisma.OrderRefundDestinationGetPayload<{
  select: typeof destinationSelect;
}>;

export type RefundDestinationWrite = {
  kind: RefundDestinationKind;
  walletId: string | null;
  bankId: string | null;
  accountName: string;
  accountNumberCiphertext: string | null;
  accountNumberLast4: string | null;
};

export const orderRefundDestinationRepository = {
  async findOrderOwnerAndDestination(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        phone: true,
        fullName: true,
        paymentMethod: true,
        refundDestination: { select: destinationSelect },
        refunds: {
          where: { status: OrderRefundStatus.NEEDS_MANUAL },
          select: { totalAmount: true },
        },
      },
    });
  },

  async findActiveBank(bankId: string) {
    return prisma.nepalBank.findFirst({
      where: { id: bankId, isActive: true },
      select: { id: true },
    });
  },

  async saveDestination(orderId: string, destination: RefundDestinationWrite) {
    return prisma.orderRefundDestination.upsert({
      where: { orderId },
      create: { orderId, ...destination },
      update: destination,
      select: destinationSelect,
    });
  },

  async findDestinationForRefund(refundId: string) {
    return prisma.orderRefund.findUnique({
      where: { id: refundId },
      select: {
        id: true,
        orderId: true,
        order: { select: { userId: true, refundDestination: { select: destinationSelect } } },
      },
    });
  },

  async listRefundsAwaitingDetails(params: { createdBefore: Date; limit: number }) {
    return prisma.orderRefund.findMany({
      where: {
        status: OrderRefundStatus.NEEDS_MANUAL,
        detailsReminderSentAt: null,
        createdAt: { lte: params.createdBefore },
        order: { refundDestination: null },
      },
      orderBy: { createdAt: "asc" },
      take: params.limit,
      select: {
        id: true,
        orderId: true,
        totalAmount: true,
        order: { select: { user: { select: { email: true } } } },
      },
    });
  },

  async markDetailsReminderSent(refundId: string): Promise<boolean> {
    const { count } = await prisma.orderRefund.updateMany({
      where: { id: refundId, detailsReminderSentAt: null },
      data: { detailsReminderSentAt: new Date() },
    });
    return count > 0;
  },

  async moveStalePendingRefundsToManual(createdBefore: Date, limit: number): Promise<string[]> {
    const staleRefunds = await prisma.orderRefund.findMany({
      where: { status: OrderRefundStatus.PENDING, createdAt: { lte: createdBefore } },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, orderId: true },
    });
    const movedRefundIds: string[] = [];
    for (const { id, orderId } of staleRefunds) {
      const isMoved = await prisma.$transaction(async (tx) => {
        const { count } = await tx.orderRefund.updateMany({
          where: { id, status: OrderRefundStatus.PENDING },
          data: {
            status: OrderRefundStatus.NEEDS_MANUAL,
            gatewayResponse: {
              note: "Payment step never finished. Check the gateway dashboard before paying.",
            },
          },
        });
        if (count === NOTHING_UPDATED) return false;
        await tx.order.update({ where: { id: orderId }, data: { needsManualRefund: true } });
        return true;
      });
      if (isMoved) movedRefundIds.push(id);
    }
    return movedRefundIds;
  },
};
