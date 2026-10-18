import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { BrandReturnSource } from "#generated/prisma/enums.js";
import { type ParcelReturnOutcome, PartnerClaimStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

const NOTHING_UPDATED = 0;

const parcelForReturnSelect = {
  id: true,
  status: true,
  orderId: true,
  hubId: true,
  trackingCode: true,
  returnCheckedInAt: true,
  partnerClaimStatus: true,
  order: { select: { userId: true, phone: true, phoneE164: true, countryCode: true } },
  fulfilmentGroups: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      brandId: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: { id: true, qty: true, refundedQty: true, unitPrice: true },
      },
    },
  },
} satisfies Prisma.ShipmentSelect;

export type ParcelForReturn = Prisma.ShipmentGetPayload<{ select: typeof parcelForReturnSelect }>;

export type BrandReturnLineInput = {
  orderItemId: string;
  resellableQty: number;
  damagedQty: number;
};

export const logisticsReturnRepository = {
  async findParcelForReturn(client: DbClient, shipmentId: string): Promise<ParcelForReturn | null> {
    return client.shipment.findUnique({ where: { id: shipmentId }, select: parcelForReturnSelect });
  },

  async markReturnCheckedIn(
    client: DbClient,
    params: {
      shipmentId: string;
      outcome: ParcelReturnOutcome;
      checkedInById: string;
      checkedInAt: Date;
      partnerClaimAmount: number | null;
    },
  ): Promise<boolean> {
    const { shipmentId, outcome, checkedInById, checkedInAt, partnerClaimAmount } = params;
    const { count } = await client.shipment.updateMany({
      where: { id: shipmentId, returnCheckedInAt: null },
      data: {
        returnOutcome: outcome,
        returnCheckedInById: checkedInById,
        returnCheckedInAt: checkedInAt,
        ...(partnerClaimAmount === null
          ? {}
          : { partnerClaimAmount, partnerClaimStatus: PartnerClaimStatus.OPEN }),
      },
    });
    return count > NOTHING_UPDATED;
  },

  async openPartnerClaim(
    client: DbClient,
    params: { shipmentId: string; partnerClaimAmount: number },
  ): Promise<boolean> {
    const { count } = await client.shipment.updateMany({
      where: { id: params.shipmentId, partnerClaimStatus: null },
      data: {
        partnerClaimAmount: params.partnerClaimAmount,
        partnerClaimStatus: PartnerClaimStatus.OPEN,
      },
    });
    return count > NOTHING_UPDATED;
  },

  async createBrandReturn(
    client: DbClient,
    brandReturn: {
      brandId: string;
      hubId: string;
      fulfilmentGroupId: string;
      shipmentId: string | null;
      source: BrandReturnSource;
      lines: readonly BrandReturnLineInput[];
    },
  ) {
    const { lines, ...brandReturnFields } = brandReturn;
    return client.brandReturn.create({
      data: { ...brandReturnFields, lines: { createMany: { data: [...lines] } } },
      select: { id: true },
    });
  },
};
