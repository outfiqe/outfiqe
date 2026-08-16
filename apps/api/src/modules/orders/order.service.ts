import { env } from "#config/env.config.js";
import {
  COD_HANDLING_FEE,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
} from "#constants/commerce.constants.js";
import { prisma } from "#db/prisma.js";
import {
  newOrderNotificationTemplate,
  orderCancelledTemplate,
  orderConfirmationTemplate,
  refundFailedTemplate,
} from "#email-templates/templates.js";
import {
  CommissionSource,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
} from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { sendEmail } from "#lib/email.utils.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { cartRepository } from "#modules/cart/cart.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { creatorLinkRepository } from "#modules/creator-links/creatorLink.repository.js";
import { paymentRepository } from "#modules/payments/payment.repository.js";
import { paymentService } from "#modules/payments/payment.service.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { resolveAttribution } from "./order.attribution.utils.js";
import { orderRepository } from "./order.repository.js";
import type {
  AdvanceFulfilmentBody,
  CheckoutBody,
  ListAdminOrdersQuery,
  ListBrandOrdersQuery,
  ListOrdersQuery,
} from "./order.schemas.js";
import type {
  BrandOrderItemView,
  CreateOrderItemInput,
  OrderAdminSummaryView,
  OrderAdminView,
} from "./order.types.js";
import { type OrderSummaryView, type OrderView } from "./order.types.js";
import {
  toBrandOrderItemView,
  toOrderAdminSummaryView,
  toOrderAdminView,
  toOrderSummaryView,
  toOrderView,
} from "./order.utils.js";

const CHECKOUT_ENDPOINT = "orders.checkout";
const CART_EMPTY_STATUS = 400;
const ITEMS_UNAVAILABLE_STATUS = 409;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

const FULFILMENT_ADVANCE_FROM: Partial<Record<FulfilmentStatus, FulfilmentStatus[]>> = {
  [FulfilmentStatus.PACKED]: [FulfilmentStatus.PLACED],
  [FulfilmentStatus.SHIPPED]: [FulfilmentStatus.PACKED],
  [FulfilmentStatus.DELIVERED]: [FulfilmentStatus.SHIPPED],
};

const CANCELLABLE_FULFILMENT_STATUSES: FulfilmentStatus[] = [
  FulfilmentStatus.PLACED,
  FulfilmentStatus.PACKED,
];

const buildOrderConfirmationEmail = (userEmail: string, order: OrderView): void => {
  const { subject, html } = orderConfirmationTemplate({
    orderId: order.id,
    total: order.total,
    paymentMethod: order.paymentMethod,
  });
  void sendEmail({
    to: userEmail,
    subject,
    body: `Order ${order.id} placed — Rs. ${order.total}.`,
    html,
  });

  const opsEmail = newOrderNotificationTemplate({ orderId: order.id, total: order.total });
  void sendEmail({
    to: env.GMAIL_USER,
    subject: opsEmail.subject,
    body: `Order ${order.id} — Rs. ${order.total}.`,
    html: opsEmail.html,
  });
};

const checkoutOnce = async (
  userId: string,
  userEmail: string,
  body: CheckoutBody,
): Promise<OrderView> => {
  const { fullName, phone, address, city, landmark, paymentMethod, sessionId } = body;

  if (sessionId) await creatorLinkRepository.bridgeSessionClicks(sessionId, userId);

  const cartId = await cartRepository.getOrCreateCartId(userId);
  const cartRows = await cartRepository.listItems(cartId);
  if (cartRows.length === 0) {
    throw new AppError("CART_EMPTY", "Your bag is empty.", CART_EMPTY_STATUS);
  }

  const stockBySizeId = await productRepository.getStockBySizeIds(
    cartRows.map((row) => row.sizeId),
  );
  const unavailable = cartRows.filter(({ sizeId, qty }) => (stockBySizeId.get(sizeId) ?? 0) < qty);
  if (unavailable.length > 0) {
    throw new AppError(
      "ITEMS_UNAVAILABLE",
      "Some items in your bag are no longer available.",
      ITEMS_UNAVAILABLE_STATUS,
      { sizeIds: unavailable.map((row) => row.sizeId) },
    );
  }

  const lines = cartRows.map(({ productId, sizeId, qty, product }) => ({
    productId,
    sizeId,
    qty,
    unitPrice: product.price,
  }));
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const codFee = paymentMethod === PaymentMethod.COD ? COD_HANDLING_FEE : 0;
  const total = subtotal + deliveryFee + codFee;

  const orderPlacedAt = new Date();
  const attributions = await Promise.all(
    lines.map((line) => resolveAttribution(userId, line.productId, orderPlacedAt)),
  );
  const tiers = await Promise.all(
    lines.map((line, index) =>
      attributions[index]
        ? commissionRepository.findTierForPrice(line.unitPrice)
        : Promise.resolve(null),
    ),
  );

  const items: CreateOrderItemInput[] = lines.map((line, index) => {
    const attribution = attributions[index];
    if (!attribution) return { ...line, attributionSource: undefined };

    const { source, creatorId, referenceId } = attribution;
    const isTagClick = source === CommissionSource.TAG_CLICK;
    return {
      ...line,
      attributedCreatorId: creatorId,
      attributedCreatorLookId: isTagClick ? referenceId : undefined,
      attributedLinkId: isTagClick ? undefined : referenceId,
      attributionSource: source,
    };
  });

  const paymentStatus =
    paymentMethod === PaymentMethod.COD ? PaymentStatus.DUE : PaymentStatus.INITIATED;
  const paymentTransactionStatus =
    paymentMethod === PaymentMethod.COD
      ? PaymentTransactionStatus.SUCCEEDED
      : PaymentTransactionStatus.INITIATED;

  const order = await prisma.$transaction(async (tx) => {
    if (paymentMethod === PaymentMethod.COD) {
      const insufficientSizeIds = await productService.decrementStockForItems(
        tx,
        lines.map(({ sizeId, qty }) => ({ sizeId, qty })),
      );
      if (insufficientSizeIds.length > 0) {
        throw new AppError(
          "ITEMS_UNAVAILABLE",
          "Some items sold out just now.",
          ITEMS_UNAVAILABLE_STATUS,
          {
            sizeIds: insufficientSizeIds,
          },
        );
      }
    }

    const createdOrder = await orderRepository.create(tx, {
      userId,
      fullName,
      phone,
      address,
      city,
      landmark,
      paymentMethod,
      paymentStatus,
      paymentTransactionStatus,
      subtotal,
      deliveryFee,
      codFee,
      total,
      items,
    });

    for (const [index, orderItem] of createdOrder.items.entries()) {
      const attribution = attributions[index];
      const tier = tiers[index];
      if (!attribution || !tier) continue;

      const { source, creatorId, clickId } = attribution;
      const { id: tierId, amount } = tier;
      const isTagClick = source === CommissionSource.TAG_CLICK;

      await commissionRepository.createPending(tx, {
        creatorId,
        orderItemId: orderItem.id,
        source,
        tagClickId: isTagClick ? clickId : undefined,
        linkClickId: isTagClick ? undefined : clickId,
        tierId,
        amount,
      });
    }

    return createdOrder;
  });

  await cartRepository.clearCart(cartId);

  const orderView = toOrderView(order);
  buildOrderConfirmationEmail(userEmail, orderView);

  return orderView;
};

export const orderService = {
  async checkout(
    userId: string,
    body: CheckoutBody,
    idempotencyKey: string | undefined,
  ): Promise<OrderView> {
    return withIdempotency(userId, CHECKOUT_ENDPOINT, idempotencyKey, async () => {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError("NOT_FOUND", "Account not found.", NOT_FOUND_STATUS);
      return checkoutOnce(userId, user.email, body);
    });
  },

  async getOrder(userId: string, orderId: string): Promise<OrderView> {
    const order = await orderRepository.findByIdForUser(userId, orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);
    return toOrderView(order);
  },

  async listOrders(
    userId: string,
    { cursor, limit }: ListOrdersQuery,
  ): Promise<{ orders: OrderSummaryView[]; nextCursor: string | null }> {
    const rows = await orderRepository.listForUser(userId, { cursor, limit });
    const { items: pagedOrders, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return { orders: pagedOrders.map(toOrderSummaryView), nextCursor };
  },

  async listAllAdmin(
    query: ListAdminOrdersQuery,
  ): Promise<{ orders: OrderAdminSummaryView[]; nextCursor: string | null }> {
    const rows = await orderRepository.listAllAdmin(query);
    const { items: pagedOrders, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);
    return { orders: pagedOrders.map(toOrderAdminSummaryView), nextCursor };
  },

  async getOrderAdmin(orderId: string): Promise<OrderAdminView> {
    const order = await orderRepository.findByIdAdmin(orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);
    return toOrderAdminView(order);
  },

  async advanceFulfilment(orderId: string, { status }: AdvanceFulfilmentBody): Promise<void> {
    const fromStatuses = FULFILMENT_ADVANCE_FROM[status] ?? [];
    const deliveredAt = status === FulfilmentStatus.DELIVERED ? new Date() : undefined;

    const updated = await orderRepository.updateFulfilmentStatus(
      orderId,
      fromStatuses,
      status,
      deliveredAt,
    );
    if (!updated) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This order can't move to that status from where it is.",
        CONFLICT_STATUS,
      );
    }
  },

  async cancel(orderId: string, adminUserId: string, reason: string): Promise<void> {
    const order = await orderRepository.findForAdminAction(orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", NOT_FOUND_STATUS);
    if (!CANCELLABLE_FULFILMENT_STATUSES.includes(order.fulfilmentStatus)) {
      throw new AppError(
        "INVALID_TRANSITION",
        "Only orders that haven't shipped yet can be cancelled.",
        CONFLICT_STATUS,
      );
    }

    const refundOutcome =
      order.paymentStatus === PaymentStatus.PAID
        ? await paymentService.refund(orderId, order.paymentMethod, order.phone)
        : null;

    const cancelled = await prisma.$transaction(async (tx) => {
      const ok = await orderRepository.markCancelled(tx, orderId, CANCELLABLE_FULFILMENT_STATUSES);
      if (!ok) return false;

      await productService.restoreStockForItems(tx, order.items);
      await commissionRepository.voidForOrder(tx, orderId, reason);

      if (refundOutcome) {
        await paymentRepository.recordRefund(
          tx,
          orderId,
          order.paymentMethod,
          refundOutcome.rawResponse,
        );
        if (refundOutcome.succeeded) {
          await orderRepository.markRefunded(tx, orderId);
        } else {
          await orderRepository.markNeedsManualRefund(tx, orderId);
        }
      }

      return true;
    });

    if (!cancelled) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This order's status changed — refresh and try again.",
        CONFLICT_STATUS,
      );
    }

    const buyer = await userRepository.findById(order.userId);
    if (buyer) {
      const { subject, html } = orderCancelledTemplate({
        orderId,
        total: order.total,
        refunded: refundOutcome?.succeeded ?? false,
      });
      void sendEmail({
        to: buyer.email,
        subject,
        body: `Order ${orderId} has been cancelled.`,
        html,
      });
    }

    if (refundOutcome && !refundOutcome.succeeded) {
      const { subject, html } = refundFailedTemplate({ orderId, total: order.total });
      void sendEmail({
        to: env.GMAIL_USER,
        subject,
        body: `Order ${orderId} needs a manual refund — automatic refund failed.`,
        html,
      });
    }

    logger.info(`Order ${orderId} cancelled by admin ${adminUserId}: ${reason}`);
  },

  async listMineAsBrand(
    userId: string,
    { cursor, limit }: ListBrandOrdersQuery,
  ): Promise<{ items: BrandOrderItemView[]; nextCursor: string | null }> {
    const brandId = await requireBrandId(userId);
    const rows = await orderRepository.listItemsForBrand(brandId, { cursor, limit });

    const { items: pagedRows, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return { items: pagedRows.map(toBrandOrderItemView), nextCursor };
  },
};
