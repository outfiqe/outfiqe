import { millisecondsInDay } from "date-fns/constants";

import { env } from "#config/env.config.js";
import { staleShipmentReminderTemplate } from "#email-templates/brand.templates.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";

import { STALE_SHIPMENT_REMINDER_MIN_AGE_DAYS } from "./order.constants.js";
import { orderRepository } from "./order.repository.js";

export const runStaleShipmentReminderDigest = async (): Promise<{ brandsNotified: number }> => {
  const shippedBefore = new Date(
    Date.now() - STALE_SHIPMENT_REMINDER_MIN_AGE_DAYS * millisecondsInDay,
  );
  const backlogs = await orderRepository.listBrandsWithStaleShippedShipments(shippedBefore);

  const ordersUrl = `${env.FRONTEND_URL}/manage-orders`;

  for (const { brandName, brandEmail, shipmentCount } of backlogs) {
    const { subject, html } = staleShipmentReminderTemplate({
      brandName,
      shipmentCount,
      ordersUrl,
    });
    void sendEmail({
      to: brandEmail,
      subject,
      body: `${brandName} has ${shipmentCount} shipment(s) to mark as delivered.`,
      html,
    });
  }

  if (backlogs.length > 0) {
    logger.info(`Stale-shipment reminder emailed ${backlogs.length} brand(s)`);
  }
  return { brandsNotified: backlogs.length };
};
