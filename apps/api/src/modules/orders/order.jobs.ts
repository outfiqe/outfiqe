import { env } from "#config/env.config.js";
import { staleShipmentReminderTemplate } from "#email-templates/templates.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";

import { STALE_SHIPMENT_REMINDER_MIN_AGE_DAYS } from "./order.constants.js";
import { orderRepository } from "./order.repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const runStaleShipmentReminderDigest = async (): Promise<{ brandsNotified: number }> => {
  const shippedBefore = new Date(Date.now() - STALE_SHIPMENT_REMINDER_MIN_AGE_DAYS * DAY_MS);
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
