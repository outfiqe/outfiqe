import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { FulfilmentStatus, PaymentStatus } from "#generated/prisma/enums.js";
import { LOW_STOCK_THRESHOLD } from "#modules/products/product.constants.js";

import { COMPARISON_WINDOW_DAYS, TREND_WINDOW_DAYS } from "./brand-overview.constants.js";
import type {
  BrandOverviewTrendPoint,
  CatalogCounts,
  RevenueWindows,
} from "./brand-overview.types.js";

const SALE_PAYMENT_STATUSES = [PaymentStatus.PAID, PaymentStatus.DUE];
const UNFULFILLED_EXCLUDED_STATUSES = [FulfilmentStatus.DELIVERED, FulfilmentStatus.CANCELLED];
const TREND_SPAN_DAYS = TREND_WINDOW_DAYS - 1;

const salePaymentFilter = Prisma.sql`o.payment_status::text IN (${Prisma.join(SALE_PAYMENT_STATUSES)})`;
const notCancelledFilter = Prisma.sql`o.fulfilment_status::text <> ${FulfilmentStatus.CANCELLED}`;

type RawRevenueRow = {
  lifetime: bigint;
  last_window: bigint;
  previous_window: bigint;
};

type RawTrendRow = {
  date: string;
  revenue: bigint;
  order_count: bigint;
};

type RawCatalogRow = {
  product_count: bigint;
  low_stock_count: bigint;
};

export const brandOverviewRepository = {
  async getRevenueWindows(brandId: string): Promise<RevenueWindows> {
    const [row] = await prisma.$queryRaw<RawRevenueRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          (now() AT TIME ZONE 'UTC') - make_interval(days => ${COMPARISON_WINDOW_DAYS}) AS current_start,
          (now() AT TIME ZONE 'UTC') - make_interval(days => ${COMPARISON_WINDOW_DAYS * 2}) AS previous_start
      )
      SELECT
        COALESCE(SUM(oi.qty * oi.unit_price), 0)::bigint AS lifetime,
        COALESCE(
          SUM(oi.qty * oi.unit_price) FILTER (WHERE o.created_at >= (SELECT current_start FROM bounds)),
          0
        )::bigint AS last_window,
        COALESCE(
          SUM(oi.qty * oi.unit_price) FILTER (
            WHERE o.created_at >= (SELECT previous_start FROM bounds)
              AND o.created_at < (SELECT current_start FROM bounds)
          ),
          0
        )::bigint AS previous_window
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE p.brand_id = ${brandId}::uuid
        AND ${salePaymentFilter}
        AND ${notCancelledFilter}
    `);

    return {
      lifetime: Number(row?.lifetime ?? 0),
      last30: Number(row?.last_window ?? 0),
      previous30: Number(row?.previous_window ?? 0),
    };
  },

  async getDailyTrend(brandId: string): Promise<BrandOverviewTrendPoint[]> {
    const rows = await prisma.$queryRaw<RawTrendRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE 'UTC') AS today,
          date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => ${TREND_SPAN_DAYS}) AS first_day
      ),
      days AS (
        SELECT generate_series((SELECT first_day FROM bounds), (SELECT today FROM bounds), interval '1 day') AS day
      ),
      daily AS (
        SELECT
          date_trunc('day', o.created_at) AS day,
          SUM(oi.qty * oi.unit_price)::bigint AS revenue,
          COUNT(DISTINCT o.id)::bigint AS order_count
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.brand_id = ${brandId}::uuid
          AND o.created_at >= (SELECT first_day FROM bounds)
          AND ${salePaymentFilter}
          AND ${notCancelledFilter}
        GROUP BY 1
      )
      SELECT
        to_char(days.day, 'YYYY-MM-DD') AS date,
        COALESCE(daily.revenue, 0)::bigint AS revenue,
        COALESCE(daily.order_count, 0)::bigint AS order_count
      FROM days
      LEFT JOIN daily ON daily.day = days.day
      ORDER BY days.day
    `);

    return rows.map((row) => ({
      date: row.date,
      revenue: Number(row.revenue),
      orderCount: Number(row.order_count),
    }));
  },

  async getCatalogCounts(brandId: string): Promise<CatalogCounts> {
    const [row] = await prisma.$queryRaw<RawCatalogRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS product_count,
        COUNT(*) FILTER (WHERE total_stock > 0 AND total_stock <= ${LOW_STOCK_THRESHOLD})::bigint AS low_stock_count
      FROM (
        SELECT p.id, COALESCE(SUM(s.stock), 0) AS total_stock
        FROM products p
        LEFT JOIN product_sizes s ON s.product_id = p.id
        WHERE p.brand_id = ${brandId}::uuid AND p.deleted_at IS NULL
        GROUP BY p.id
      ) product_stock
    `);

    return {
      productCount: Number(row?.product_count ?? 0),
      lowStockCount: Number(row?.low_stock_count ?? 0),
    };
  },

  async getUnfulfilledItemCount(brandId: string): Promise<number> {
    return prisma.orderItem.count({
      where: {
        product: { brandId },
        order: {
          paymentStatus: { in: SALE_PAYMENT_STATUSES },
          fulfilmentStatus: { notIn: UNFULFILLED_EXCLUDED_STATUSES },
        },
      },
    });
  },
};
