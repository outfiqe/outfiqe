import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { FulfilmentStatus, PaymentStatus } from "#generated/prisma/enums.js";

import type { LastBoughtSize } from "./savedSize.types.js";

const BOUGHT_PAYMENT_STATUSES = [PaymentStatus.PAID, PaymentStatus.DUE];

export const savedSizeRepository = {
  async listActiveProductTypes(userId: string) {
    return prisma.productType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: {
        id: true,
        slug: true,
        label: true,
        sizeOptions: { orderBy: { sortOrder: "asc" }, select: { label: true } },
        savedSizes: { where: { userId }, select: { sizeLabel: true } },
      },
    });
  },

  async listLastBoughtSizes(userId: string): Promise<LastBoughtSize[]> {
    return prisma.$queryRaw<LastBoughtSize[]>(Prisma.sql`
      SELECT DISTINCT ON (p.product_type_id)
        p.product_type_id AS "productTypeId",
        ps.label AS "sizeLabel"
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      JOIN product_sizes ps ON ps.id = oi.size_id
      WHERE o.user_id = ${userId}::uuid
        AND o.payment_status::text IN (${Prisma.join(BOUGHT_PAYMENT_STATUSES)})
        AND o.fulfilment_status::text <> ${FulfilmentStatus.CANCELLED}
      ORDER BY p.product_type_id, o.created_at DESC, oi.id
    `);
  },

  async hasSizeOption(productTypeId: string, sizeLabel: string): Promise<boolean> {
    const matchingOption = await prisma.sizeOption.findFirst({
      where: { productTypeId, label: sizeLabel, productType: { isActive: true } },
      select: { id: true },
    });
    return matchingOption !== null;
  },

  async upsert(userId: string, productTypeId: string, sizeLabel: string): Promise<void> {
    await prisma.savedSize.upsert({
      where: { userId_productTypeId: { userId, productTypeId } },
      create: { userId, productTypeId, sizeLabel },
      update: { sizeLabel },
    });
  },

  async remove(userId: string, productTypeId: string): Promise<void> {
    await prisma.savedSize.deleteMany({ where: { userId, productTypeId } });
  },
};
