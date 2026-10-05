import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { AccountStatus, OutfitStatus, ProductStatus } from "#generated/prisma/enums.js";

const NO_STOCK = 0;

export type StockAlertItemRow = { outfitId: string; productId: string };

const touchesChangedSizes = (sizeIds: string[]): Prisma.ProductWhereInput => ({
  sizes: { some: { id: { in: sizeIds } } },
});

export const outfitStockRepository = {
  async claimNewlySoldOutItems(
    tx: Prisma.TransactionClient,
    sizeIds: string[],
    alertedAt: Date,
  ): Promise<StockAlertItemRow[]> {
    return tx.outfitItem.updateManyAndReturn({
      where: {
        soldOutAlertedAt: null,
        outfit: { status: OutfitStatus.DRAFT },
        product: {
          AND: [touchesChangedSizes(sizeIds), { sizes: { none: { stock: { gt: NO_STOCK } } } }],
        },
      },
      data: { soldOutAlertedAt: alertedAt },
      select: { outfitId: true, productId: true },
    });
  },

  async releaseRestockedItems(
    tx: Prisma.TransactionClient,
    sizeIds: string[],
  ): Promise<StockAlertItemRow[]> {
    return tx.outfitItem.updateManyAndReturn({
      where: {
        soldOutAlertedAt: { not: null },
        product: {
          AND: [touchesChangedSizes(sizeIds), { sizes: { some: { stock: { gt: NO_STOCK } } } }],
        },
      },
      data: { soldOutAlertedAt: null },
      select: { outfitId: true, productId: true },
    });
  },

  async listProductNames(productIds: string[]): Promise<Map<string, string>> {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    return new Map(products.map(({ id, name }) => [id, name]));
  },

  async findItemProductAt(outfitId: string, slotKey: string, position: number) {
    const item = await prisma.outfitItem.findFirst({
      where: { outfitId, position, slot: { key: slotKey } },
      select: { product: { select: { productTypeId: true, brandId: true, price: true } } },
    });
    return item?.product ?? null;
  },

  async listReplacementProductIds(
    outfitId: string,
    { productTypeId, brandId, price }: { productTypeId: string; brandId: string; price: number },
    limit: number,
  ): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ productId: string }[]>(Prisma.sql`
      SELECT candidate.id AS "productId"
      FROM products candidate
      JOIN brands candidate_brand ON candidate_brand.id = candidate.brand_id
      WHERE candidate.product_type_id = ${productTypeId}::uuid
        AND candidate.status::text = ${ProductStatus.APPROVED}
        AND candidate.deleted_at IS NULL
        AND candidate_brand.account_status::text = ${AccountStatus.ACTIVE}
        AND EXISTS (
          SELECT 1 FROM product_sizes size
          WHERE size.product_id = candidate.id AND size.stock > ${NO_STOCK}
        )
        AND NOT EXISTS (
          SELECT 1 FROM outfit_items taken
          WHERE taken.outfit_id = ${outfitId}::uuid AND taken.product_id = candidate.id
        )
      ORDER BY
        (candidate.brand_id = ${brandId}::uuid) DESC,
        abs(candidate.price - ${price}),
        candidate.id
      LIMIT ${limit}
    `);
    return rows.map(({ productId }) => productId);
  },
};
