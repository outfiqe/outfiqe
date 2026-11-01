import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type {
  BrandPayoutStatus,
  CommissionStatus,
  PaymentMethod,
} from "#generated/prisma/enums.js";

import {
  LEDGER_FOCUS,
  type LedgerFocus,
  OUTSTANDING_BRAND_PAYOUT_STATUSES,
  OUTSTANDING_COMMISSION_STATUSES,
} from "../financial-rollup.constants.js";
import type { LedgerRow, LedgerTotals } from "../financial-rollup.types.js";

export type LedgerFilters = {
  paymentMethod?: PaymentMethod;
  brandPayoutStatus?: BrandPayoutStatus;
  commissionStatus?: CommissionStatus;
  focus?: LedgerFocus;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  cursor?: { createdAt: Date; orderItemId: string };
  limit: number;
};

type LedgerMatchFilters = Omit<LedgerFilters, "cursor" | "limit">;

const EMPTY_LEDGER_TOTALS: LedgerTotals = {
  rowCount: 0,
  grossAmount: 0,
  platformFee: 0,
  gatewayFee: 0,
  creatorCommissionAmount: 0,
  brandNetAmount: 0,
};

const LEDGER_JOINS = Prisma.sql`
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN users buyer ON buyer.id = o.user_id
  JOIN products p ON p.id = oi.product_id
  JOIN brands b ON b.id = p.brand_id
  LEFT JOIN users muse ON muse.id = oi.attributed_creator_id
  LEFT JOIN brand_payouts bp ON bp.order_item_id = oi.id
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(
        SUM(commission.amount) FILTER (WHERE commission.status <> 'VOIDED'),
        SUM(commission.amount)
      )::int AS amount,
      (ARRAY_AGG(
        commission.status ORDER BY (commission.status = 'VOIDED'), commission.created_at DESC
      ))[1] AS status
    FROM creator_commissions commission
    WHERE commission.order_item_id = oi.id
  ) cc ON TRUE
`;

const buildFocusCondition = (focus: LedgerFocus): Prisma.Sql => {
  switch (focus) {
    case LEDGER_FOCUS.OWED_TO_BRANDS:
      return Prisma.sql`bp.status::text IN (${Prisma.join([...OUTSTANDING_BRAND_PAYOUT_STATUSES])})`;
    case LEDGER_FOCUS.OWED_TO_MUSES:
      return Prisma.sql`cc.status::text IN (${Prisma.join([...OUTSTANDING_COMMISSION_STATUSES])})`;
    case LEDGER_FOCUS.REFUNDED:
      return Prisma.sql`(
        oi.refunded_qty > 0 OR o.payment_status IN ('REFUNDED', 'PARTIALLY_REFUNDED')
      )`;
    case LEDGER_FOCUS.MUSE_CREDITED:
      return Prisma.sql`oi.attributed_creator_id IS NOT NULL`;
    case LEDGER_FOCUS.PLATFORM_EARNED:
      return Prisma.sql`bp.status = 'WITHDRAWN'`;
  }
};

const escapeLikeWildcards = (text: string): string => text.replace(/[\\%_]/g, "\\$&");

const buildSearchCondition = (search: string): Prisma.Sql => {
  const escapedSearch = escapeLikeWildcards(search);
  const containsSearch = `%${escapedSearch}%`;
  return Prisma.sql`(
    o.id::text ILIKE ${`${escapedSearch}%`}
    OR o.full_name ILIKE ${containsSearch}
    OR o.phone ILIKE ${containsSearch}
    OR buyer.name ILIKE ${containsSearch}
    OR buyer.email ILIKE ${containsSearch}
    OR p.name ILIKE ${containsSearch}
    OR b.name ILIKE ${containsSearch}
  )`;
};

const buildMatchConditions = ({
  paymentMethod,
  brandPayoutStatus,
  commissionStatus,
  focus,
  search,
  dateFrom,
  dateTo,
}: LedgerMatchFilters): Prisma.Sql[] => {
  const conditions = [Prisma.sql`TRUE`];
  if (paymentMethod) conditions.push(Prisma.sql`o.payment_method = ${paymentMethod}`);
  if (brandPayoutStatus) conditions.push(Prisma.sql`bp.status = ${brandPayoutStatus}`);
  if (commissionStatus) conditions.push(Prisma.sql`cc.status = ${commissionStatus}`);
  if (focus) conditions.push(buildFocusCondition(focus));
  if (search) conditions.push(buildSearchCondition(search));
  if (dateFrom) conditions.push(Prisma.sql`oi.created_at >= ${dateFrom}`);
  if (dateTo) conditions.push(Prisma.sql`oi.created_at <= ${dateTo}`);
  return conditions;
};

const ledgerItemSelect = {
  id: true,
  qty: true,
  unitPrice: true,
  listUnitPrice: true,
  brandDiscountAmount: true,
  refundedQty: true,
  createdAt: true,
  attributionSource: true,
  attributedCreatorLookId: true,
  attributedOutfitId: true,
  size: { select: { label: true } },
  product: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
      brand: { select: { id: true, name: true } },
    },
  },
  attributedCreator: { select: { id: true, name: true, handle: true } },
  brandPayout: {
    select: {
      grossAmount: true,
      platformFee: true,
      gatewayFee: true,
      netAmount: true,
      status: true,
      availableAt: true,
      withdrawnAt: true,
      voidedReason: true,
      needsManualClawback: true,
    },
  },
  commissions: {
    select: {
      id: true,
      amount: true,
      status: true,
      source: true,
      availableAt: true,
      paidAt: true,
      voidedReason: true,
      creator: { select: { name: true, handle: true } },
      recipientBrand: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  order: {
    select: {
      id: true,
      createdAt: true,
      fullName: true,
      phone: true,
      address: true,
      city: true,
      paymentMethod: true,
      paymentStatus: true,
      fulfilmentStatus: true,
      subtotal: true,
      deliveryFee: true,
      total: true,
      platformDiscountTotal: true,
      brandDiscountTotal: true,
      user: { select: { id: true, name: true, email: true, handle: true } },
      couponRedemption: {
        select: {
          discountAmount: true,
          platformFundedAmount: true,
          brandFundedAmount: true,
          status: true,
          coupon: { select: { code: true } },
        },
      },
      transactions: {
        select: {
          id: true,
          provider: true,
          type: true,
          status: true,
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      refunds: {
        select: {
          id: true,
          status: true,
          cause: true,
          reason: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { items: true } },
    },
  },
} satisfies Prisma.OrderItemSelect;

export type LedgerItemDetail = Prisma.OrderItemGetPayload<{ select: typeof ledgerItemSelect }>;

export const financialRollupLedgerRepository = {
  async listLedger({ cursor, limit, ...matchFilters }: LedgerFilters): Promise<LedgerRow[]> {
    const conditions = buildMatchConditions(matchFilters);
    if (cursor) {
      conditions.push(
        Prisma.sql`(oi.created_at, oi.id) < (${cursor.createdAt}, ${cursor.orderItemId})`,
      );
    }

    return prisma.$queryRaw<LedgerRow[]>(Prisma.sql`
      SELECT
        o.id AS "orderId",
        oi.id AS "orderItemId",
        oi.created_at AS "createdAt",
        o.payment_method AS "paymentMethod",
        o.payment_status AS "orderPaymentStatus",
        o.fulfilment_status AS "orderFulfilmentStatus",
        oi.qty AS "quantity",
        p.name AS "productName",
        p.image_url AS "productImageUrl",
        b.name AS "brandName",
        buyer.name AS "buyerName",
        muse.handle AS "museHandle",
        bp.gross_amount AS "grossAmount",
        bp.platform_fee AS "platformFee",
        bp.gateway_fee AS "gatewayFee",
        bp.net_amount AS "brandNetAmount",
        bp.status AS "brandPayoutStatus",
        cc.amount AS "creatorCommissionAmount",
        cc.status AS "creatorCommissionStatus"
      ${LEDGER_JOINS}
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY oi.created_at DESC, oi.id DESC
      LIMIT ${limit + 1}
    `);
  },

  async sumLedger(matchFilters: LedgerMatchFilters): Promise<LedgerTotals> {
    const [ledgerTotals = EMPTY_LEDGER_TOTALS] = await prisma.$queryRaw<LedgerTotals[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "rowCount",
        COALESCE(SUM(bp.gross_amount), 0)::int AS "grossAmount",
        COALESCE(SUM(bp.platform_fee), 0)::int AS "platformFee",
        COALESCE(SUM(bp.gateway_fee), 0)::int AS "gatewayFee",
        COALESCE(SUM(cc.amount), 0)::int AS "creatorCommissionAmount",
        COALESCE(SUM(bp.net_amount), 0)::int AS "brandNetAmount"
      ${LEDGER_JOINS}
      WHERE ${Prisma.join(buildMatchConditions(matchFilters), " AND ")}
    `);
    return ledgerTotals;
  },

  findLedgerItem(orderItemId: string): Promise<LedgerItemDetail | null> {
    return prisma.orderItem.findUnique({ where: { id: orderItemId }, select: ledgerItemSelect });
  },
};
