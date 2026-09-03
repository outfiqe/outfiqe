import { prisma } from "#db/prisma.js";
import { ProductStatus } from "#generated/prisma/enums.js";

import type { MetricBucket, ProductTrendMeta } from "./trending.types.js";

const upsertPurchaseUnitsBucket = (bucketStart: Date) => prisma.$executeRaw`
  INSERT INTO product_trend_metrics (id, product_id, bucket_start, purchase_units, updated_at)
  SELECT gen_random_uuid(), oi.product_id, ${bucketStart}, SUM(oi.qty), now()
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.created_at >= ${bucketStart}
    AND o.fulfilment_status != 'CANCELLED'
    AND o.payment_status IN ('PAID', 'DUE')
  GROUP BY oi.product_id
  ON CONFLICT (product_id, bucket_start)
  DO UPDATE SET purchase_units = excluded.purchase_units, updated_at = now();
`;

const upsertCartAddsBucket = (bucketStart: Date) => prisma.$executeRaw`
  INSERT INTO product_trend_metrics (id, product_id, bucket_start, cart_adds, updated_at)
  SELECT gen_random_uuid(), product_id, ${bucketStart}, COUNT(*), now()
  FROM cart_items
  WHERE created_at >= ${bucketStart}
  GROUP BY product_id
  ON CONFLICT (product_id, bucket_start)
  DO UPDATE SET cart_adds = excluded.cart_adds, updated_at = now();
`;

const upsertSavesBucket = (bucketStart: Date) => prisma.$executeRaw`
  INSERT INTO product_trend_metrics (id, product_id, bucket_start, saves, updated_at)
  SELECT gen_random_uuid(), product_id, ${bucketStart}, COUNT(*), now()
  FROM saved_products
  WHERE created_at >= ${bucketStart}
  GROUP BY product_id
  ON CONFLICT (product_id, bucket_start)
  DO UPDATE SET saves = excluded.saves, updated_at = now();
`;

const upsertCreatorTagsBucket = (bucketStart: Date) => prisma.$executeRaw`
  INSERT INTO product_trend_metrics (id, product_id, bucket_start, creator_tags, updated_at)
  SELECT gen_random_uuid(), product_id, ${bucketStart}, COUNT(*), now()
  FROM creator_look_products
  WHERE created_at >= ${bucketStart}
  GROUP BY product_id
  ON CONFLICT (product_id, bucket_start)
  DO UPDATE SET creator_tags = excluded.creator_tags, updated_at = now();
`;

const upsertTagClicksBucket = (bucketStart: Date) => prisma.$executeRaw`
  INSERT INTO product_trend_metrics (id, product_id, bucket_start, tag_clicks, updated_at)
  SELECT gen_random_uuid(), product_id, ${bucketStart}, COUNT(DISTINCT session_id), now()
  FROM creator_look_tag_clicks
  WHERE created_at >= ${bucketStart}
  GROUP BY product_id
  ON CONFLICT (product_id, bucket_start)
  DO UPDATE SET tag_clicks = excluded.tag_clicks, updated_at = now();
`;

export const trendingRepository = {
  async upsertHourlyMetrics(bucketStart: Date): Promise<void> {
    await Promise.all([
      upsertPurchaseUnitsBucket(bucketStart),
      upsertCartAddsBucket(bucketStart),
      upsertSavesBucket(bucketStart),
      upsertCreatorTagsBucket(bucketStart),
      upsertTagClicksBucket(bucketStart),
    ]);
  },

  async deleteMetricsOlderThan(cutoff: Date): Promise<number> {
    const { count } = await prisma.productTrendMetric.deleteMany({
      where: { bucketStart: { lt: cutoff } },
    });
    return count;
  },

  async listRecentMetricBuckets(sinceDays: number): Promise<MetricBucket[]> {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    return prisma.productTrendMetric.findMany({
      where: { bucketStart: { gte: since } },
      select: {
        productId: true,
        bucketStart: true,
        purchaseUnits: true,
        cartAdds: true,
        saves: true,
        creatorTags: true,
        tagClicks: true,
      },
    });
  },

  async listActiveProductMeta(productIds: string[]): Promise<ProductTrendMeta[]> {
    if (productIds.length === 0) return [];
    return prisma.product.findMany({
      where: { id: { in: productIds }, status: ProductStatus.APPROVED, deletedAt: null },
      select: { id: true, brandId: true, productTypeId: true, createdAt: true },
    });
  },
};
