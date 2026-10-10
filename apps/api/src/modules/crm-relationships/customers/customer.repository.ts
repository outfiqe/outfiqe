import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";

import { RECENT_ACTIVITY_LIMIT } from "../crm-relationships.constants.js";
import { nameOrHandleSearch, readTotalCount, toIso } from "../crm-relationships.query-helpers.js";
import type { CustomerOrderRow, CustomerSummary } from "../crm-relationships.types.js";

type CustomerListRow = {
  user_id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  order_count: number;
  item_count: number;
  total_paid: number;
  first_order_at: Date | null;
  last_order_at: Date | null;
  total_count: bigint;
};

export const crmCustomerRepository = {
  async listCustomers(
    brandId: string,
    params: { query: string; limit: number; offset: number },
  ): Promise<{ items: CustomerSummary[]; total: number }> {
    const rows = await prisma.$queryRaw<CustomerListRow[]>(Prisma.sql`
      WITH brand_products AS (
        SELECT id FROM products WHERE brand_id = ${brandId}::uuid
      ),
      brand_order_items AS (
        SELECT oi.order_id, oi.qty, oi.unit_price, o.user_id, o.payment_status,
               o.fulfilment_status, o.created_at
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id IN (SELECT id FROM brand_products)
            AND o.fulfilment_status <> 'CANCELLED'
      )
      SELECT u.id AS user_id, u.name, u.handle, u.avatar_url,
             COUNT(DISTINCT boi.order_id)::int AS order_count,
             COALESCE(SUM(boi.qty), 0)::int AS item_count,
             COALESCE(SUM(boi.qty * boi.unit_price)
               FILTER (WHERE boi.payment_status = 'PAID'), 0)::int AS total_paid,
             MIN(boi.created_at) AS first_order_at,
             MAX(boi.created_at) AS last_order_at,
             COUNT(*) OVER () AS total_count
        FROM brand_order_items boi
        JOIN users u ON u.id = boi.user_id
        WHERE TRUE ${nameOrHandleSearch(params.query)}
        GROUP BY u.id, u.name, u.handle, u.avatar_url
        ORDER BY total_paid DESC, order_count DESC, u.id DESC
        LIMIT ${params.limit} OFFSET ${params.offset}
    `);

    return {
      items: rows.map((row) => ({
        userId: row.user_id,
        name: row.name,
        handle: row.handle,
        avatarUrl: row.avatar_url,
        orderCount: row.order_count,
        itemCount: row.item_count,
        totalPaid: row.total_paid,
        firstOrderAt: toIso(row.first_order_at),
        lastOrderAt: toIso(row.last_order_at),
      })),
      total: readTotalCount(rows),
    };
  },

  async findCustomerCore(brandId: string, userId: string): Promise<CustomerSummary | null> {
    const rows = await prisma.$queryRaw<CustomerListRow[]>(Prisma.sql`
      WITH brand_products AS (
        SELECT id FROM products WHERE brand_id = ${brandId}::uuid
      ),
      brand_order_items AS (
        SELECT oi.order_id, oi.qty, oi.unit_price, o.payment_status, o.created_at
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id IN (SELECT id FROM brand_products)
            AND o.user_id = ${userId}::uuid
            AND o.fulfilment_status <> 'CANCELLED'
      )
      SELECT u.id AS user_id, u.name, u.handle, u.avatar_url,
             COUNT(DISTINCT boi.order_id)::int AS order_count,
             COALESCE(SUM(boi.qty), 0)::int AS item_count,
             COALESCE(SUM(boi.qty * boi.unit_price)
               FILTER (WHERE boi.payment_status = 'PAID'), 0)::int AS total_paid,
             MIN(boi.created_at) AS first_order_at,
             MAX(boi.created_at) AS last_order_at,
             0::bigint AS total_count
        FROM users u
        JOIN brand_order_items boi ON TRUE
        WHERE u.id = ${userId}::uuid
        GROUP BY u.id, u.name, u.handle, u.avatar_url
    `);

    const row = rows[0];
    if (!row || row.order_count === 0) return null;

    return {
      userId: row.user_id,
      name: row.name,
      handle: row.handle,
      avatarUrl: row.avatar_url,
      orderCount: row.order_count,
      itemCount: row.item_count,
      totalPaid: row.total_paid,
      firstOrderAt: toIso(row.first_order_at),
      lastOrderAt: toIso(row.last_order_at),
    };
  },

  async recentCustomerOrders(brandId: string, userId: string): Promise<CustomerOrderRow[]> {
    const rows = await prisma.$queryRaw<
      {
        order_id: string;
        item_count: number;
        brand_subtotal: number;
        payment_status: string;
        fulfilment_status: string;
        created_at: Date;
      }[]
    >(Prisma.sql`
      WITH brand_products AS (
        SELECT id FROM products WHERE brand_id = ${brandId}::uuid
      )
      SELECT o.id AS order_id,
             COALESCE(SUM(oi.qty), 0)::int AS item_count,
             COALESCE(SUM(oi.qty * oi.unit_price), 0)::int AS brand_subtotal,
             o.payment_status, o.fulfilment_status, o.created_at
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ${userId}::uuid
          AND oi.product_id IN (SELECT id FROM brand_products)
          AND o.fulfilment_status <> 'CANCELLED'
        GROUP BY o.id, o.payment_status, o.fulfilment_status, o.created_at
        ORDER BY o.created_at DESC
        LIMIT ${RECENT_ACTIVITY_LIMIT}
    `);

    return rows.map((row) => ({
      orderId: row.order_id,
      itemCount: row.item_count,
      brandSubtotal: row.brand_subtotal,
      paymentStatus: row.payment_status,
      fulfilmentStatus: row.fulfilment_status,
      createdAt: row.created_at.toISOString(),
    }));
  },
};
