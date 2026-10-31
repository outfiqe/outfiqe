import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { FulfilmentStatus, PaymentStatus } from "#generated/prisma/enums.js";
import { LOW_STOCK_THRESHOLD } from "#modules/products/product.constants.js";

import { LOW_STOCK_PRODUCT_LIMIT, TOP_PRODUCT_LIMIT } from "./brand-overview.constants.js";
import type {
  BrandLowStockProduct,
  BrandOverviewTrendPoint,
  BrandTopProduct,
  CatalogCounts,
  RevenueWindows,
} from "./brand-overview.types.js";

const SALE_PAYMENT_STATUSES = [PaymentStatus.PAID, PaymentStatus.DUE];
const UNFULFILLED_EXCLUDED_STATUSES = [FulfilmentStatus.DELIVERED, FulfilmentStatus.CANCELLED];
const TODAY_COUNTED_IN_PERIOD = 1;
const WINDOWS_COMPARED = 2;

const salePaymentFilter = Prisma.sql`o.payment_status::text IN (${Prisma.join(SALE_PAYMENT_STATUSES)})`;
const notCancelledFilter = Prisma.sql`o.fulfilment_status::text <> ${FulfilmentStatus.CANCELLED}`;

type RawRevenueRow = {
  lifetime: bigint;
  last_window: bigint;
  previous_window: bigint;
  period_order_count: bigint;
};

type RawTrendRow = {
  date: string;
  revenue: bigint;
  order_count: bigint;
};

type RawTopProductRow = {
  id: string;
  name: string;
  image_url: string | null;
  units_sold: bigint;
  revenue: bigint;
};

type RawLowStockRow = {
  id: string;
  name: string;
  image_url: string | null;
  stock_left: bigint;
};

type RawCatalogRow = {
  product_count: bigint;
  low_stock_count: bigint;
};

export const brandOverviewRepository = {
  async getRevenueWindows(brandId: string, periodDays: number): Promise<RevenueWindows> {
    const [row] = await prisma.$queryRaw<RawRevenueRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          (now() AT TIME ZONE 'UTC') - make_interval(days => ${periodDays}) AS current_start,
          (now() AT TIME ZONE 'UTC') - make_interval(days => ${periodDays * WINDOWS_COMPARED}) AS previous_start
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
        )::bigint AS previous_window,
        COUNT(DISTINCT o.id) FILTER (
          WHERE o.created_at >= (SELECT current_start FROM bounds)
        )::bigint AS period_order_count
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE p.brand_id = ${brandId}::uuid
        AND ${salePaymentFilter}
        AND ${notCancelledFilter}
    `);

    return {
      lifetime: Number(row?.lifetime ?? 0),
      period: Number(row?.last_window ?? 0),
      previousPeriod: Number(row?.previous_window ?? 0),
      periodOrderCount: Number(row?.period_order_count ?? 0),
    };
  },

  async getDailyTrend(brandId: string, periodDays: number): Promise<BrandOverviewTrendPoint[]> {
    const trendSpanDays = periodDays - TODAY_COUNTED_IN_PERIOD;
    const rows = await prisma.$queryRaw<RawTrendRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE 'UTC') AS today,
          date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => ${trendSpanDays}) AS first_day
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

  async getTopProducts(brandId: string, periodDays: number): Promise<BrandTopProduct[]> {
    const rows = await prisma.$queryRaw<RawTopProductRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.name,
        p.image_url,
        SUM(oi.qty)::bigint AS units_sold,
        SUM(oi.qty * oi.unit_price)::bigint AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE p.brand_id = ${brandId}::uuid
        AND o.created_at >= (now() AT TIME ZONE 'UTC') - make_interval(days => ${periodDays})
        AND ${salePaymentFilter}
        AND ${notCancelledFilter}
      GROUP BY p.id
      ORDER BY revenue DESC, p.id
      LIMIT ${TOP_PRODUCT_LIMIT}
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      unitsSold: Number(row.units_sold),
      revenue: Number(row.revenue),
    }));
  },

  async getLowStockProducts(brandId: string): Promise<BrandLowStockProduct[]> {
    const rows = await prisma.$queryRaw<RawLowStockRow[]>(Prisma.sql`
      SELECT p.id, p.name, p.image_url, COALESCE(SUM(s.stock), 0)::bigint AS stock_left
      FROM products p
      LEFT JOIN product_sizes s ON s.product_id = p.id
      WHERE p.brand_id = ${brandId}::uuid AND p.deleted_at IS NULL
      GROUP BY p.id
      HAVING COALESCE(SUM(s.stock), 0) > 0
        AND COALESCE(SUM(s.stock), 0) <= ${LOW_STOCK_THRESHOLD}
      ORDER BY stock_left, p.id
      LIMIT ${LOW_STOCK_PRODUCT_LIMIT}
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      stockLeft: Number(row.stock_left),
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
