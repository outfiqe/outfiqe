import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";

import { RECENT_ACTIVITY_LIMIT } from "../crm-relationships.constants.js";
import { nameOrHandleSearch, readTotalCount, toIso } from "../crm-relationships.query-helpers.js";
import type {
  PartnerAttributedOrderRow,
  PartnerProductBreakdownRow,
  PartnerSummary,
} from "../crm-relationships.types.js";

type PartnerListRow = {
  creator_id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  tag_click_count: number;
  attributed_order_count: number;
  attributed_revenue: number;
  last_activity_at: Date | null;
  total_count: bigint;
};

export const crmPartnerRepository = {
  async listPartners(
    brandId: string,
    params: { query: string; limit: number; offset: number },
  ): Promise<{ items: PartnerSummary[]; total: number }> {
    const rows = await prisma.$queryRaw<PartnerListRow[]>(Prisma.sql`
      WITH brand_products AS (
        SELECT id FROM products WHERE brand_id = ${brandId}::uuid
      ),
      partner_creators AS (
        SELECT creator_id FROM creator_links
          WHERE product_id IN (SELECT id FROM brand_products)
        UNION
        SELECT cl.creator_id
          FROM creator_look_products clp
          JOIN creator_looks cl ON cl.id = clp.creator_look_id
          WHERE clp.product_id IN (SELECT id FROM brand_products)
        UNION
        SELECT attributed_creator_id
          FROM order_items
          WHERE attributed_creator_id IS NOT NULL
            AND product_id IN (SELECT id FROM brand_products)
      ),
      tag_clicks AS (
        SELECT cl.creator_id,
               COUNT(*)::int AS cnt,
               MAX(tc.created_at) AS last_at
          FROM creator_look_tag_clicks tc
          JOIN creator_looks cl ON cl.id = tc.creator_look_id
          WHERE tc.product_id IN (SELECT id FROM brand_products)
          GROUP BY cl.creator_id
      ),
      attributed AS (
        SELECT oi.attributed_creator_id AS creator_id,
               COUNT(*)::int AS order_cnt,
               COALESCE(SUM(oi.unit_price * oi.qty), 0)::int AS revenue,
               MAX(oi.created_at) AS last_at
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.attributed_creator_id IS NOT NULL
            AND oi.product_id IN (SELECT id FROM brand_products)
            AND o.fulfilment_status <> 'CANCELLED'
          GROUP BY oi.attributed_creator_id
      )
      SELECT u.id AS creator_id, u.name, u.handle, u.avatar_url,
             COALESCE(tc.cnt, 0) AS tag_click_count,
             COALESCE(a.order_cnt, 0) AS attributed_order_count,
             COALESCE(a.revenue, 0) AS attributed_revenue,
             GREATEST(tc.last_at, a.last_at) AS last_activity_at,
             COUNT(*) OVER () AS total_count
        FROM partner_creators pc
        JOIN users u ON u.id = pc.creator_id
        LEFT JOIN tag_clicks tc ON tc.creator_id = u.id
        LEFT JOIN attributed a ON a.creator_id = u.id
        WHERE TRUE ${nameOrHandleSearch(params.query)}
        ORDER BY attributed_revenue DESC, tag_click_count DESC, u.id DESC
        LIMIT ${params.limit} OFFSET ${params.offset}
    `);

    return {
      items: rows.map((row) => ({
        creatorId: row.creator_id,
        name: row.name,
        handle: row.handle,
        avatarUrl: row.avatar_url,
        tagClickCount: row.tag_click_count,
        attributedOrderCount: row.attributed_order_count,
        attributedRevenue: row.attributed_revenue,
        lastActivityAt: toIso(row.last_activity_at),
      })),
      total: readTotalCount(rows),
    };
  },

  async isBrandPartner(brandId: string, creatorId: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>(Prisma.sql`
      WITH brand_products AS (
        SELECT id FROM products WHERE brand_id = ${brandId}::uuid
      )
      SELECT EXISTS (
        SELECT 1 FROM creator_links
          WHERE creator_id = ${creatorId}::uuid
            AND product_id IN (SELECT id FROM brand_products)
        UNION ALL
        SELECT 1
          FROM creator_look_products clp
          JOIN creator_looks cl ON cl.id = clp.creator_look_id
          WHERE cl.creator_id = ${creatorId}::uuid
            AND clp.product_id IN (SELECT id FROM brand_products)
        UNION ALL
        SELECT 1 FROM order_items
          WHERE attributed_creator_id = ${creatorId}::uuid
            AND product_id IN (SELECT id FROM brand_products)
      ) AS exists
    `);
    return rows[0]?.exists ?? false;
  },

  async findPartnerCore(brandId: string, creatorId: string): Promise<PartnerSummary | null> {
    const rows = await prisma.$queryRaw<PartnerListRow[]>(Prisma.sql`
      WITH brand_products AS (
        SELECT id FROM products WHERE brand_id = ${brandId}::uuid
      ),
      tag_clicks AS (
        SELECT COUNT(*)::int AS cnt, MAX(tc.created_at) AS last_at
          FROM creator_look_tag_clicks tc
          JOIN creator_looks cl ON cl.id = tc.creator_look_id
          WHERE tc.product_id IN (SELECT id FROM brand_products)
            AND cl.creator_id = ${creatorId}::uuid
      ),
      attributed AS (
        SELECT COUNT(*)::int AS order_cnt,
               COALESCE(SUM(oi.unit_price * oi.qty), 0)::int AS revenue,
               MAX(oi.created_at) AS last_at
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.attributed_creator_id = ${creatorId}::uuid
            AND oi.product_id IN (SELECT id FROM brand_products)
            AND o.fulfilment_status <> 'CANCELLED'
      )
      SELECT u.id AS creator_id, u.name, u.handle, u.avatar_url,
             tc.cnt AS tag_click_count,
             a.order_cnt AS attributed_order_count,
             a.revenue AS attributed_revenue,
             GREATEST(tc.last_at, a.last_at) AS last_activity_at,
             0::bigint AS total_count
        FROM users u
        CROSS JOIN tag_clicks tc
        CROSS JOIN attributed a
        WHERE u.id = ${creatorId}::uuid
    `);

    const row = rows[0];
    if (!row || (row.tag_click_count === 0 && row.attributed_order_count === 0)) return null;

    return {
      creatorId: row.creator_id,
      name: row.name,
      handle: row.handle,
      avatarUrl: row.avatar_url,
      tagClickCount: row.tag_click_count,
      attributedOrderCount: row.attributed_order_count,
      attributedRevenue: row.attributed_revenue,
      lastActivityAt: toIso(row.last_activity_at),
    };
  },

  async partnerProductBreakdown(
    brandId: string,
    creatorId: string,
  ): Promise<PartnerProductBreakdownRow[]> {
    const rows = await prisma.$queryRaw<
      {
        product_id: string;
        product_name: string;
        tag_click_count: number;
        attributed_order_count: number;
        attributed_revenue: number;
      }[]
    >(Prisma.sql`
      WITH brand_products AS (
        SELECT id, name FROM products WHERE brand_id = ${brandId}::uuid
      ),
      clicks AS (
        SELECT tc.product_id, COUNT(*)::int AS cnt
          FROM creator_look_tag_clicks tc
          JOIN creator_looks cl ON cl.id = tc.creator_look_id
          WHERE cl.creator_id = ${creatorId}::uuid
            AND tc.product_id IN (SELECT id FROM brand_products)
          GROUP BY tc.product_id
      ),
      sales AS (
        SELECT oi.product_id,
               COUNT(*)::int AS order_cnt,
               COALESCE(SUM(oi.unit_price * oi.qty), 0)::int AS revenue
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.attributed_creator_id = ${creatorId}::uuid
            AND oi.product_id IN (SELECT id FROM brand_products)
            AND o.fulfilment_status <> 'CANCELLED'
          GROUP BY oi.product_id
      )
      SELECT bp.id AS product_id, bp.name AS product_name,
             COALESCE(c.cnt, 0) AS tag_click_count,
             COALESCE(s.order_cnt, 0) AS attributed_order_count,
             COALESCE(s.revenue, 0) AS attributed_revenue
        FROM brand_products bp
        LEFT JOIN clicks c ON c.product_id = bp.id
        LEFT JOIN sales s ON s.product_id = bp.id
        WHERE COALESCE(c.cnt, 0) > 0 OR COALESCE(s.order_cnt, 0) > 0
        ORDER BY attributed_revenue DESC, tag_click_count DESC
    `);

    return rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      tagClickCount: row.tag_click_count,
      attributedOrderCount: row.attributed_order_count,
      attributedRevenue: row.attributed_revenue,
    }));
  },

  async recentAttributedOrders(
    brandId: string,
    creatorId: string,
  ): Promise<PartnerAttributedOrderRow[]> {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        attributedCreatorId: creatorId,
        product: { brandId },
        order: { fulfilmentStatus: { not: "CANCELLED" } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        orderId: true,
        qty: true,
        unitPrice: true,
        createdAt: true,
        product: { select: { name: true } },
        order: { select: { paymentStatus: true, fulfilmentStatus: true } },
      },
    });

    return orderItems.map((item) => ({
      orderItemId: item.id,
      orderId: item.orderId,
      productName: item.product.name,
      qty: item.qty,
      unitPrice: item.unitPrice,
      paymentStatus: item.order.paymentStatus,
      fulfilmentStatus: item.order.fulfilmentStatus,
      createdAt: item.createdAt.toISOString(),
    }));
  },
};
