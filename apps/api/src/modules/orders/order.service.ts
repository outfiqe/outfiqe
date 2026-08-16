import { env } from "#config/env.config.js";
import {
  COD_HANDLING_FEE,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
} from "#constants/commerce.constants.js";
import { prisma } from "#db/prisma.js";
import {
  newOrderNotificationTemplate,
  orderConfirmationTemplate,
} from "#email-templates/templates.js";
import {
  CommissionSource,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { cartRepository } from "#modules/cart/cart.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { creatorLinkRepository } from "#modules/creator-links/creatorLink.repository.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { resolveAttribution } from "./order.attribution.utils.js";
import { orderRepository } from "./order.repository.js";
import type { CheckoutBody, ListOrdersQuery } from "./order.schemas.js";
import type { CreateOrderItemInput } from "./order.types.js";
import { type OrderSummaryView, type OrderView } from "./order.types.js";
import { toOrderSummaryView, toOrderView } from "./order.utils.js";

const CHECKOUT_ENDPOINT = "orders.checkout";
const CART_EMPTY_STATUS = 400;
const ITEMS_UNAVAILABLE_STATUS = 409;
const NOT_FOUND_STATUS = 404;

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
};
