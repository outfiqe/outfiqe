import "../src/config/load-env.js";

import { FulfilmentStatus } from "../src/generated/prisma/enums.js";
import { deriveOrderFulfilment } from "../src/modules/orders/order.utils.js";
import { prisma } from "../src/shared/db/prisma.js";

const BATCH_SIZE = 200;

const isDryRun = process.argv.includes("--dry-run");

const timestampsForSeededStatus = (
  status: FulfilmentStatus,
  orderDeliveredAt: Date | null,
  orderUpdatedAt: Date,
): {
  packedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
} => {
  switch (status) {
    case FulfilmentStatus.PACKED:
      return { packedAt: orderUpdatedAt, shippedAt: null, deliveredAt: null, cancelledAt: null };
    case FulfilmentStatus.SHIPPED:
      return {
        packedAt: orderUpdatedAt,
        shippedAt: orderUpdatedAt,
        deliveredAt: null,
        cancelledAt: null,
      };
    case FulfilmentStatus.DELIVERED:
      return {
        packedAt: orderUpdatedAt,
        shippedAt: orderUpdatedAt,
        deliveredAt: orderDeliveredAt ?? orderUpdatedAt,
        cancelledAt: null,
      };
    case FulfilmentStatus.CANCELLED:
      return { packedAt: null, shippedAt: null, deliveredAt: null, cancelledAt: orderUpdatedAt };
    default:
      return { packedAt: null, shippedAt: null, deliveredAt: null, cancelledAt: null };
  }
};

const backfillOrder = async (order: {
  id: string;
  fulfilmentStatus: FulfilmentStatus;
  deliveredAt: Date | null;
  updatedAt: Date;
  items: { id: string; product: { brandId: string } }[];
}): Promise<boolean> => {
  const itemIdsByBrandId = new Map<string, string[]>();
  for (const item of order.items) {
    const existing = itemIdsByBrandId.get(item.product.brandId) ?? [];
    existing.push(item.id);
    itemIdsByBrandId.set(item.product.brandId, existing);
  }
  if (itemIdsByBrandId.size === 0) return false;

  const seededTimestamps = timestampsForSeededStatus(
    order.fulfilmentStatus,
    order.deliveredAt,
    order.updatedAt,
  );
  const { fulfilmentSummary } = deriveOrderFulfilment(
    Array.from({ length: itemIdsByBrandId.size }, () => order.fulfilmentStatus),
  );

  if (isDryRun) return true;

  await prisma.$transaction(async (tx) => {
    for (const [brandId, itemIds] of itemIdsByBrandId) {
      const group = await tx.orderFulfilmentGroup.upsert({
        where: { orderId_brandId: { orderId: order.id, brandId } },
        create: {
          orderId: order.id,
          brandId,
          status: order.fulfilmentStatus,
          ...seededTimestamps,
        },
        update: {},
      });
      await tx.orderItem.updateMany({
        where: { id: { in: itemIds } },
        data: { fulfilmentGroupId: group.id },
      });
    }
    await tx.order.update({ where: { id: order.id }, data: { fulfilmentSummary } });
  });

  return true;
};

const backfill = async (): Promise<void> => {
  let scanned = 0;
  let backfilled = 0;

  for (;;) {
    const ungroupedOrders = await prisma.order.findMany({
      where: { items: { some: { fulfilmentGroupId: null } } },
      select: {
        id: true,
        fulfilmentStatus: true,
        deliveredAt: true,
        updatedAt: true,
        items: { select: { id: true, product: { select: { brandId: true } } } },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    });
    if (ungroupedOrders.length === 0) break;

    for (const order of ungroupedOrders) {
      scanned += 1;
      if (await backfillOrder(order)) backfilled += 1;
    }
    process.stdout.write(`scanned ${scanned}, grouped ${backfilled}\n`);

    if (isDryRun) break;
  }

  process.stdout.write(
    `${isDryRun ? "[dry-run] " : ""}done: ${backfilled} of ${scanned} orders grouped\n`,
  );
};

backfill()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
