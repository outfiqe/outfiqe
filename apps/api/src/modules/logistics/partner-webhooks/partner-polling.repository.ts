import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  DeliveryPartnerConnection,
  PartnerBookingStatus,
  PartnerWebhookVerification,
} from "#generated/prisma/enums.js";

import { SHIPMENT_STATUSES_WITH_PARTNER } from "../logistics.constants.js";

const notPolledSince = (polledBefore: Date): Prisma.ShipmentPartnerBookingWhereInput => ({
  OR: [{ lastPolledAt: null }, { lastPolledAt: { lt: polledBefore } }],
});

export const logisticsPartnerPollingRepository = {
  async listBookingsToPoll(params: {
    pollOnlyPartnersBefore: Date;
    quietParcelsBefore: Date;
    limit: number;
  }) {
    const { pollOnlyPartnersBefore, quietParcelsBefore, limit } = params;
    return prisma.shipmentPartnerBooking.findMany({
      where: {
        status: PartnerBookingStatus.BOOKED,
        connection: DeliveryPartnerConnection.API,
        partnerReference: { not: null },
        partner: { isActive: true, supportsPolling: true },
        shipment: { status: { in: SHIPMENT_STATUSES_WITH_PARTNER } },
        OR: [
          {
            partner: { webhookVerification: PartnerWebhookVerification.NONE },
            ...notPolledSince(pollOnlyPartnersBefore),
          },
          {
            partner: { webhookVerification: { not: PartnerWebhookVerification.NONE } },
            shipment: { lastEventAt: { lt: quietParcelsBefore } },
            ...notPolledSince(quietParcelsBefore),
          },
        ],
      },
      orderBy: [{ lastPolledAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
      take: limit,
      select: {
        id: true,
        partnerReference: true,
        requestedAt: true,
        partner: { select: { id: true, code: true, adapterKey: true } },
        partnerAccount: {
          select: {
            id: true,
            hubId: true,
            merchantAccountRef: true,
            pickupPointRef: true,
            credentialsKey: true,
          },
        },
      },
    });
  },

  async markBookingPolled(bookingId: string, polledAt: Date): Promise<void> {
    await prisma.shipmentPartnerBooking.update({
      where: { id: bookingId },
      data: { lastPolledAt: polledAt },
    });
  },
};
