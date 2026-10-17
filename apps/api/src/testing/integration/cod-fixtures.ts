import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import {
  DeliveryPartnerConnection,
  PartnerBookingStatus,
  PaymentMethod,
  PaymentStatus,
  ShipmentStatus,
} from "#generated/prisma/enums.js";

import { createDeliveryPartnerCovering, createHub } from "./logistics-fixtures.js";
import { createParcelOnItsWayBack } from "./return-fixtures.js";

const PARCEL_UNIT_PRICE = 1000;
const PARCEL_UNITS = 1;
const QUOTED_PARTNER_FEE = 120;
const SHORT_SUFFIX_LENGTH = 8;

const shortSuffix = () => randomUUID().slice(0, SHORT_SUFFIX_LENGTH);

const findOrCreatePartnerAccount = (partnerId: string, hubId: string) =>
  prisma.deliveryPartnerAccount.upsert({
    where: { partnerId_hubId: { partnerId, hubId } },
    create: { partnerId, hubId, merchantAccountRef: `OUTFIQE-${shortSuffix()}` },
    update: {},
  });

export const createCodPartner = async () => {
  const hub = await createHub();
  return createDeliveryPartnerCovering({ hubId: hub.id, deliveryZoneIds: [] });
};

export const createCashParcelWithPartner = async (
  partnerId: string,
  { shipmentStatus = ShipmentStatus.OUT_FOR_DELIVERY }: { shipmentStatus?: ShipmentStatus } = {},
) => {
  const parcel = await createParcelOnItsWayBack({
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.DUE,
    lines: [{ unitPrice: PARCEL_UNIT_PRICE, qty: PARCEL_UNITS }],
    shipmentStatus,
  });
  const { order, shipment, hub } = parcel;
  const shipmentWithCash = await prisma.shipment.update({
    where: { id: shipment.id },
    data: { codAmountToCollect: order.total, labelCodAmount: order.total },
  });
  const account = await findOrCreatePartnerAccount(partnerId, hub.id);
  const partnerReference = `PX-${shortSuffix()}`;
  await prisma.shipmentPartnerBooking.create({
    data: {
      shipmentId: shipment.id,
      partnerId,
      partnerAccountId: account.id,
      merchantReference: shipment.trackingCode,
      partnerReference,
      connection: DeliveryPartnerConnection.MANUAL,
      status: PartnerBookingStatus.BOOKED,
      partnerFee: QUOTED_PARTNER_FEE,
      bookedAt: new Date(),
    },
  });
  return { ...parcel, shipment: shipmentWithCash, partnerReference };
};
