import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";

import type { BrandTagPolicy } from "../creator-look.types.js";

export const creatorLookTagReviewRepository = {
  async listTrustedBrandIds(creatorId: string, brandIds: string[]): Promise<Set<string>> {
    if (brandIds.length === 0) return new Set();
    const rows = await prisma.$queryRaw<{ brand_id: string }[]>(Prisma.sql`
      WITH candidate_brands AS (
        SELECT DISTINCT unnest(${brandIds}::uuid[]) AS brand_id
      )
      SELECT cb.brand_id
      FROM candidate_brands cb
      WHERE EXISTS (
          SELECT 1 FROM brand_trusted_creators btc
          WHERE btc.brand_id = cb.brand_id AND btc.creator_id = ${creatorId}::uuid
        )
        OR EXISTS (
          SELECT 1 FROM creator_look_products clp
          JOIN creator_looks cl ON cl.id = clp.creator_look_id
          JOIN products p ON p.id = clp.product_id
          WHERE cl.creator_id = ${creatorId}::uuid
            AND p.brand_id = cb.brand_id
            AND clp.review_status = 'APPROVED'
        )
        OR EXISTS (
          SELECT 1 FROM creator_links clk
          JOIN products p ON p.id = clk.product_id
          WHERE clk.creator_id = ${creatorId}::uuid AND p.brand_id = cb.brand_id
        )
        OR EXISTS (
          SELECT 1 FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.attributed_creator_id = ${creatorId}::uuid AND p.brand_id = cb.brand_id
        )
        OR EXISTS (
          SELECT 1 FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          JOIN products p ON p.id = oi.product_id
          WHERE o.user_id = ${creatorId}::uuid
            AND p.brand_id = cb.brand_id
            AND o.payment_status = 'PAID'
            AND o.fulfilment_status <> 'CANCELLED'
        )
    `);
    return new Set(rows.map((row) => row.brand_id));
  },

  async listBrandTagPolicies(brandIds: string[]): Promise<BrandTagPolicy[]> {
    if (brandIds.length === 0) return [];
    return prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, tagReviewPolicy: true, autoApproveVerifiedBuyers: true },
    });
  },
};
