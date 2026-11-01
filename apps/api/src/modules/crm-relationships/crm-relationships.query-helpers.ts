import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";

import { RECENT_ACTIVITY_LIMIT } from "./crm-relationships.constants.js";
import type { RelationshipOrderLine, RelationshipOrderRow } from "./crm-relationships.types.js";

type RecentOrderQueryRow = {
  order_id: string;
  item_count: number;
  brand_subtotal: number;
  payment_method: string;
  payment_status: string;
  fulfilment_status: string;
  delivered_at: Date | null;
  created_at: Date;
  lines: RelationshipOrderLine[];
};

export const nameOrHandleSearch = (query: string): Prisma.Sql => {
  if (query.length === 0) return Prisma.empty;
  const pattern = `%${query}%`;
  return Prisma.sql`AND (u.name ILIKE ${pattern} OR u.handle ILIKE ${pattern})`;
};

export const toIso = (value: Date | null): string | null => value?.toISOString() ?? null;

export const readTotalCount = (rows: { total_count: bigint }[]): number => {
  const [first] = rows;
  return first ? Number(first.total_count) : 0;
};

export const recentBrandOrders = async (
  brandId: string,
  orderScope: Prisma.Sql,
): Promise<RelationshipOrderRow[]> => {
  const rows = await prisma.$queryRaw<RecentOrderQueryRow[]>(Prisma.sql`
    SELECT o.id AS order_id,
           SUM(oi.qty)::int AS item_count,
           SUM(oi.qty * oi.unit_price)::int AS brand_subtotal,
           o.payment_method, o.payment_status, o.fulfilment_status,
           o.delivered_at, o.created_at,
           json_agg(
             json_build_object(
               'orderItemId', oi.id,
               'productId', p.id,
               'productName', p.name,
               'imageUrl', p.image_url,
               'sizeLabel', ps.label,
               'qty', oi.qty,
               'unitPrice', oi.unit_price,
               'refundedQty', oi.refunded_qty,
               'isLive', p.status = 'APPROVED'
             ) ORDER BY oi.created_at, oi.id
           ) AS lines
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      JOIN product_sizes ps ON ps.id = oi.size_id
     WHERE p.brand_id = ${brandId}::uuid
       AND o.fulfilment_status <> 'CANCELLED'
       ${orderScope}
     GROUP BY o.id
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT ${RECENT_ACTIVITY_LIMIT}
  `);

  return rows.map((row) => ({
    orderId: row.order_id,
    itemCount: row.item_count,
    brandSubtotal: row.brand_subtotal,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    fulfilmentStatus: row.fulfilment_status,
    deliveredAt: toIso(row.delivered_at),
    createdAt: row.created_at.toISOString(),
    lines: row.lines,
  }));
};
