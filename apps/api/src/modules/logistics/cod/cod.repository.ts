import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { PartnerBookingStatus, ShipmentStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

const PAGE_LOOKAHEAD = 1;
const NO_CASH = 0;

type RawPartnerCashRow = {
  partner_id: string;
  partner_name: string;
  currency: string;
  cod_remittance_days: number;
  unremitted_parcel_count: bigint;
  unremitted_amount: bigint;
  overdue_parcel_count: bigint;
  overdue_amount: bigint;
  oldest_delivered_at: Date;
};

export type PartnerCashRow = {
  partnerId: string;
  partnerName: string;
  currency: string;
  codRemittanceDays: number;
  unremittedParcelCount: number;
  unremittedAmount: number;
  overdueParcelCount: number;
  overdueAmount: number;
  oldestDeliveredAt: Date;
};

const buildUnremittedCashWhere = (partnerId: string): Prisma.ShipmentWhereInput => ({
  status: ShipmentStatus.DELIVERED,
  codCollectedAmount: { gt: NO_CASH },
  codRemittanceLine: { is: null },
  bookings: { some: { partnerId, status: PartnerBookingStatus.BOOKED } },
});

const unremittedParcelSelect = (partnerId: string) =>
  ({
    id: true,
    trackingCode: true,
    orderId: true,
    currency: true,
    codAmountToCollect: true,
    codCollectedAmount: true,
    deliveredAt: true,
    bookings: {
      where: { partnerId, status: PartnerBookingStatus.BOOKED },
      select: { partnerReference: true, partnerFee: true },
      take: 1,
    },
  }) satisfies Prisma.ShipmentSelect;

export type UnremittedParcelRecord = Prisma.ShipmentGetPayload<{
  select: ReturnType<typeof unremittedParcelSelect>;
}>;

const remittanceSummarySelect = {
  id: true,
  partnerId: true,
  partner: { select: { name: true } },
  reference: true,
  currency: true,
  receivedAt: true,
  collectedAmount: true,
  partnerFeeAmount: true,
  receivedAmount: true,
  recordedBy: { select: { name: true } },
  createdAt: true,
  _count: { select: { lines: true } },
} satisfies Prisma.CodRemittanceSelect;

export type CodRemittanceSummaryRecord = Prisma.CodRemittanceGetPayload<{
  select: typeof remittanceSummarySelect;
}>;

const remittanceDetailSelect = {
  ...remittanceSummarySelect,
  note: true,
  lines: {
    orderBy: { shipment: { deliveredAt: "asc" } },
    select: {
      shipmentId: true,
      collectedAmount: true,
      partnerFeeAmount: true,
      shipment: { select: { trackingCode: true, orderId: true } },
    },
  },
} satisfies Prisma.CodRemittanceSelect;

export type CodRemittanceDetailRecord = Prisma.CodRemittanceGetPayload<{
  select: typeof remittanceDetailSelect;
}>;

const toPartnerCashRow = (row: RawPartnerCashRow): PartnerCashRow => ({
  partnerId: row.partner_id,
  partnerName: row.partner_name,
  currency: row.currency,
  codRemittanceDays: row.cod_remittance_days,
  unremittedParcelCount: Number(row.unremitted_parcel_count),
  unremittedAmount: Number(row.unremitted_amount),
  overdueParcelCount: Number(row.overdue_parcel_count),
  overdueAmount: Number(row.overdue_amount),
  oldestDeliveredAt: row.oldest_delivered_at,
});

export const logisticsCodRepository = {
  async summarizeUnremittedCashByPartner(): Promise<PartnerCashRow[]> {
    const rows = await prisma.$queryRaw<RawPartnerCashRow[]>(Prisma.sql`
      WITH unremitted AS (
        SELECT
          p.id AS partner_id,
          p.name AS partner_name,
          p.cod_remittance_days,
          s.currency,
          s.cod_collected_amount,
          s.delivered_at,
          s.delivered_at + make_interval(days => p.cod_remittance_days)
            < (now() AT TIME ZONE 'UTC') AS is_overdue
        FROM shipments s
        JOIN shipment_partner_bookings b
          ON b.shipment_id = s.id AND b.status = ${PartnerBookingStatus.BOOKED}::"PartnerBookingStatus"
        JOIN delivery_partners p ON p.id = b.partner_id
        LEFT JOIN cod_remittance_lines l ON l.shipment_id = s.id
        WHERE s.status = ${ShipmentStatus.DELIVERED}::"ShipmentStatus"
          AND s.cod_collected_amount > ${NO_CASH}
          AND l.id IS NULL
      )
      SELECT
        partner_id,
        partner_name,
        currency,
        cod_remittance_days,
        COUNT(*)::bigint AS unremitted_parcel_count,
        SUM(cod_collected_amount)::bigint AS unremitted_amount,
        COUNT(*) FILTER (WHERE is_overdue)::bigint AS overdue_parcel_count,
        COALESCE(SUM(cod_collected_amount) FILTER (WHERE is_overdue), ${NO_CASH})::bigint AS overdue_amount,
        MIN(delivered_at) AS oldest_delivered_at
      FROM unremitted
      GROUP BY partner_id, partner_name, currency, cod_remittance_days
      ORDER BY overdue_parcel_count DESC, partner_name ASC
    `);
    return rows.map(toPartnerCashRow);
  },

  async findPartnerForCash(partnerId: string) {
    return prisma.deliveryPartner.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, codRemittanceDays: true },
    });
  },

  async listUnremittedParcels(params: {
    partnerId: string;
    deliveredBefore?: Date;
    cursor?: string;
    limit: number;
  }): Promise<UnremittedParcelRecord[]> {
    return prisma.shipment.findMany({
      where: {
        ...buildUnremittedCashWhere(params.partnerId),
        ...(params.deliveredBefore ? { deliveredAt: { lt: params.deliveredBefore } } : {}),
      },
      orderBy: [{ deliveredAt: "asc" }, { id: "asc" }],
      take: params.limit + PAGE_LOOKAHEAD,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: PAGE_LOOKAHEAD } : {}),
      select: unremittedParcelSelect(params.partnerId),
    });
  },

  async listParcelsToRemit(client: DbClient, partnerId: string, shipmentIds: string[]) {
    return client.shipment.findMany({
      where: { id: { in: shipmentIds }, ...buildUnremittedCashWhere(partnerId) },
      select: { id: true, trackingCode: true, currency: true, codCollectedAmount: true },
    });
  },

  async createRemittance(
    client: DbClient,
    remittance: Omit<Prisma.CodRemittanceUncheckedCreateInput, "lines"> & {
      lines: Prisma.CodRemittanceLineCreateManyRemittanceInput[];
    },
  ): Promise<{ id: string }> {
    const { lines, ...remittanceFields } = remittance;
    return client.codRemittance.create({
      data: { ...remittanceFields, lines: { createMany: { data: lines } } },
      select: { id: true },
    });
  },

  async listRemittances(params: {
    partnerId?: string;
    cursor?: string;
    limit: number;
  }): Promise<CodRemittanceSummaryRecord[]> {
    return prisma.codRemittance.findMany({
      where: params.partnerId ? { partnerId: params.partnerId } : {},
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      take: params.limit + PAGE_LOOKAHEAD,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: PAGE_LOOKAHEAD } : {}),
      select: remittanceSummarySelect,
    });
  },

  async findRemittance(remittanceId: string): Promise<CodRemittanceDetailRecord | null> {
    return prisma.codRemittance.findUnique({
      where: { id: remittanceId },
      select: remittanceDetailSelect,
    });
  },
};
