import { prismaRead } from "#db/prisma.js";
import { PaymentMethod, PaymentStatus, type UserRole } from "#generated/prisma/enums.js";

import type { OrderAnalyticsSummary } from "./product-analytics.types.js";

const NO_ITEM_QUANTITY = 0;
const NO_ATTRIBUTED_ITEMS = 0;

const SETTLED_ONLINE_PAYMENT_STATUSES = [
  PaymentStatus.PAID,
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
];

const countEarlierPlacedOrders = (userId: string, placedBefore: Date) =>
  prismaRead.order.count({
    where: {
      userId,
      createdAt: { lt: placedBefore },
      OR: [
        { paymentMethod: PaymentMethod.COD },
        { paymentStatus: { in: SETTLED_ONLINE_PAYMENT_STATUSES } },
      ],
    },
  });

export const productAnalyticsRepository = {
  async findOrderAnalyticsSummary(orderId: string): Promise<OrderAnalyticsSummary | null> {
    const order = await prismaRead.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        total: true,
        paymentMethod: true,
        createdAt: true,
        couponRedemption: { select: { id: true } },
      },
    });
    if (!order) return null;

    const [itemQuantity, brandCount, attributedItemCount, earlierPlacedOrderCount] =
      await Promise.all([
        prismaRead.orderItem.aggregate({ where: { orderId }, _sum: { qty: true } }),
        prismaRead.brand.count({
          where: { products: { some: { orderItems: { some: { orderId } } } } },
        }),
        prismaRead.orderItem.count({ where: { orderId, attributedCreatorId: { not: null } } }),
        countEarlierPlacedOrders(order.userId, order.createdAt),
      ]);

    return {
      orderId,
      userId: order.userId,
      total: order.total,
      paymentMethod: order.paymentMethod,
      itemQuantity: itemQuantity._sum.qty ?? NO_ITEM_QUANTITY,
      brandCount,
      earlierPlacedOrderCount,
      hasCreatorAttribution: attributedItemCount > NO_ATTRIBUTED_ITEMS,
      hasCoupon: order.couponRedemption !== null,
    };
  },

  async findUserRole(userId: string): Promise<UserRole | null> {
    const user = await prismaRead.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? null;
  },

  countLookProductTags(lookId: string): Promise<number> {
    return prismaRead.creatorLookProduct.count({ where: { creatorLookId: lookId } });
  },

  async findSupportTicketRequesterId(ticketId: string): Promise<string | null> {
    const ticket = await prismaRead.supportTicket.findUnique({
      where: { id: ticketId },
      select: { requesterUserId: true },
    });
    return ticket?.requesterUserId ?? null;
  },
};
