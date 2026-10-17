import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import {
  DeliveryPartnerConnection,
  PartnerBookingStatus,
  PartnerWebhookVerification,
  ShipmentStatus,
} from "#generated/prisma/enums.js";

import {
  createDeliveryPartnerCovering,
  createHubOrder,
  packGroupsIntoParcel,
  requireFixtureId,
} from "./logistics-fixtures.js";

export const PARTNER_CREDENTIALS_KEY = "INTEGRATION_HTTP_JSON";
export const PARTNER_API_KEY = "integration-api-key-0123456789";
export const PARTNER_BASE_URL = "https://partner.integration.example/api";
export const PARTNER_WEBHOOK_SECRET = "integration-webhook-secret-0123";

export const PARTNER_CREDENTIAL_ENV = {
  [`DELIVERY_PARTNER_${PARTNER_CREDENTIALS_KEY}_API_KEY`]: PARTNER_API_KEY,
  [`DELIVERY_PARTNER_${PARTNER_CREDENTIALS_KEY}_BASE_URL`]: PARTNER_BASE_URL,
  [`DELIVERY_PARTNER_${PARTNER_CREDENTIALS_KEY}_WEBHOOK_SECRET`]: PARTNER_WEBHOOK_SECRET,
};

type ParcelWithApiPartnerOptions = {
  webhookVerification?: PartnerWebhookVerification;
  shipmentStatus?: ShipmentStatus;
  bookingStatus?: PartnerBookingStatus;
  isBookedBefore?: boolean;
};

export const createParcelWithApiPartner = async ({
  webhookVerification = PartnerWebhookVerification.SIGNATURE,
  shipmentStatus = ShipmentStatus.HANDED_TO_PARTNER,
  bookingStatus = PartnerBookingStatus.BOOKED,
  isBookedBefore = bookingStatus === PartnerBookingStatus.BOOKED,
}: ParcelWithApiPartnerOptions = {}) => {
  const { hub, order, hubGroupIds } = await createHubOrder();
  const partner = await createDeliveryPartnerCovering({
    hubId: hub.id,
    deliveryZoneIds: [],
    apiConnection: { credentialsKey: PARTNER_CREDENTIALS_KEY, webhookVerification },
  });
  const [account] = partner.accounts;
  const shipment = await packGroupsIntoParcel(order.id, hub.id, hubGroupIds);
  await prisma.shipment.update({ where: { id: shipment.id }, data: { status: shipmentStatus } });
  const partnerReference = isBookedBefore ? `PX-${randomUUID().slice(0, 8)}` : null;
  const booking = await prisma.shipmentPartnerBooking.create({
    data: {
      shipmentId: shipment.id,
      partnerId: partner.id,
      partnerAccountId: requireFixtureId(account?.id),
      merchantReference: shipment.trackingCode,
      connection: DeliveryPartnerConnection.API,
      status: bookingStatus,
      partnerReference,
      bookedAt: isBookedBefore ? new Date() : null,
    },
  });
  return { hub, order, partner, shipment, booking, partnerReference };
};
