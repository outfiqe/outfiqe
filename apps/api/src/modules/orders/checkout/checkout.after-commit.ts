import { env } from "#config/env.config.js";
import {
  newOrderNotificationTemplate,
  orderConfirmationTemplate,
} from "#email-templates/order.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { PaymentMethod } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";

import type { OrderView } from "../order.types.js";
import type { CreatedCreatorCommission } from "./checkout.types.js";

type PublishCheckoutEventsInput = {
  orderId: string;
  userId: string;
  paymentMethod: PaymentMethod;
  createdCommissions: CreatedCreatorCommission[];
};

export const publishCheckoutEvents = async ({
  orderId,
  userId,
  paymentMethod,
  createdCommissions,
}: PublishCheckoutEventsInput): Promise<void> => {
  if (paymentMethod === PaymentMethod.COD) {
    await eventBus.publish(DomainEvents.PRODUCT_PURCHASED, { orderId, userId });
  }
  for (const commission of createdCommissions) {
    await eventBus.publish(DomainEvents.SALE_GENERATED, {
      orderItemId: commission.orderItemId,
      creatorId: commission.creatorId,
      commissionAmount: commission.amount,
    });
  }
};

export const sendOrderConfirmationEmails = (userEmail: string, order: OrderView): void => {
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
    to: env.OPS_NOTIFICATION_EMAIL,
    subject: opsEmail.subject,
    body: `Order ${order.id} — Rs. ${order.total}.`,
    html: opsEmail.html,
  });
};
