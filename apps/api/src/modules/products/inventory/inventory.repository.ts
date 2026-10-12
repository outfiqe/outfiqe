import { prisma } from "#db/prisma.js";
import type { DbClient } from "#types/db.types.js";

import type {
  BrandProductSize,
  InventoryLedgerEntryInput,
  StockLedgerMismatch,
} from "../product.types.js";

export const productInventoryRepository = {
  async decrementStock(client: DbClient, sizeId: string, qty: number): Promise<boolean> {
    const result = await client.productSize.updateMany({
      where: { id: sizeId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    return result.count > 0;
  },

  async restoreStock(client: DbClient, sizeId: string, qty: number): Promise<void> {
    await client.productSize.update({
      where: { id: sizeId },
      data: { stock: { increment: qty } },
    });
  },

  async recordInventoryMovements(
    client: DbClient,
    entries: InventoryLedgerEntryInput[],
  ): Promise<void> {
    if (entries.length === 0) return;
    await client.inventoryLedgerEntry.createMany({ data: entries });
  },

  async findStockLedgerMismatches(limit: number): Promise<StockLedgerMismatch[]> {
    return prisma.$queryRaw<StockLedgerMismatch[]>`
      SELECT ps."id" AS "sizeId", ps."stock" AS "stock", COALESCE(SUM(entry."delta"), 0)::int AS "ledgerTotal"
      FROM "product_sizes" ps
      JOIN "inventory_ledger_entries" entry ON entry."size_id" = ps."id"
      GROUP BY ps."id", ps."stock"
      HAVING ps."stock" <> COALESCE(SUM(entry."delta"), 0)
      ORDER BY ps."id"
      LIMIT ${limit}`;
  },

  async recordOpeningBalancesForUntrackedSizes(): Promise<number> {
    return prisma.$executeRaw`
      INSERT INTO "inventory_ledger_entries" ("id", "size_id", "delta", "kind", "source_type", "source_id")
      SELECT gen_random_uuid(), ps."id", ps."stock", 'OPENING_BALANCE', 'PRODUCT_SIZE', ps."id"::text
      FROM "product_sizes" ps
      WHERE NOT EXISTS (
        SELECT 1 FROM "inventory_ledger_entries" entry WHERE entry."size_id" = ps."id"
      )
      ON CONFLICT DO NOTHING`;
  },

  async findSizeIdsForProduct(productId: string, sizeIds: string[]): Promise<string[]> {
    const sizes = await prisma.productSize.findMany({
      where: { productId, id: { in: sizeIds } },
      select: { id: true },
    });
    return sizes.map((size) => size.id);
  },

  async listSizesForProduct(productId: string): Promise<BrandProductSize[]> {
    return prisma.productSize.findMany({
      where: { productId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, stock: true },
    });
  },

  async getStockBySizeIds(sizeIds: string[]): Promise<Map<string, number>> {
    const sizes = await prisma.productSize.findMany({
      where: { id: { in: sizeIds } },
      select: { id: true, stock: true },
    });
    return new Map(sizes.map((size) => [size.id, size.stock]));
  },
};
