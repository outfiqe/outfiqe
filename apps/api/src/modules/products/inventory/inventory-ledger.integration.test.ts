import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandRole,
  InventoryMovementKind,
  InventoryMovementSource,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { isCheckConstraintViolation } from "#lib/prisma.utils.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { ensureProductType } from "#test/integration/product-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

import { runInventoryLedgerReconciliation } from "../product.jobs.js";
import { productService } from "../product.service.js";
import type { StockMovement } from "../product.types.js";

const STOCK_NON_NEGATIVE_CONSTRAINT = "product_sizes_stock_non_negative";
const INITIAL_STOCK = 4;
const RESTOCK_AMOUNT = 3;
const OVERSELL_STOCK = 12;
const OVERSELL_BUYER_COUNT = 20;
const SINGLE_UNIT = 1;
const EMPTY_LEDGER_TOTAL = 0;

const createBrandOwner = async () => {
  const user = await prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Ledger Owner",
      handle: `ledger-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.BRAND_OWNER,
    },
  });
  const brand = await prisma.brand.create({
    data: {
      name: `Ledger Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  await prisma.brandMembership.create({
    data: { userId: user.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  const { accessToken } = generateTokenpair({ sub: user.id, role: UserRole.BRAND_OWNER });
  return { brand, authHeader: `Bearer ${accessToken}` };
};

const createProductThroughApi = async (authHeader: string) => {
  const productTypeId = await ensureProductType();
  const sizeOption = await prisma.sizeOption.create({
    data: { productTypeId, label: `M-${randomUUID().slice(0, 4)}`, sortOrder: 0 },
  });
  const categorySlug = `cat-${randomUUID().slice(0, 8)}`;
  await prisma.category.create({ data: { slug: categorySlug, name: "Ledger Category" } });

  const response = await request(testApp)
    .post("/api/products")
    .set("Authorization", authHeader)
    .send({
      name: "Ledger Jacket",
      price: 3_200,
      type: "tops",
      categories: [categorySlug],
      sizes: [{ sizeOptionId: sizeOption.id, stock: INITIAL_STOCK }],
    });
  expect(response.status).toBe(HTTP_STATUS.CREATED);
  const productId: string = response.body.data.id;
  const size = await prisma.productSize.findFirstOrThrow({ where: { productId } });
  return { productId, sizeId: size.id };
};

const createSizeWithStock = async (stock: number) => {
  const { brand } = await createBrandOwner();
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Direct Jacket",
      price: 1_000,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  return prisma.productSize.create({ data: { productId: product.id, label: "M", stock } });
};

const orderCommitFor = (orderId: string): StockMovement => ({
  kind: InventoryMovementKind.ORDER_COMMIT,
  sourceType: InventoryMovementSource.ORDER,
  sourceId: orderId,
});

const buyOneUnit = (sizeId: string, orderId = randomUUID()) =>
  prisma.$transaction(async (tx) => {
    const insufficientSizeIds = await productService.decrementStockForItems(
      tx,
      [{ sizeId, qty: SINGLE_UNIT }],
      orderCommitFor(orderId),
    );
    if (insufficientSizeIds.length > 0) throw new Error("sold out");
  });

const ledgerTotalFor = async (sizeId: string): Promise<number> => {
  const { _sum } = await prisma.inventoryLedgerEntry.aggregate({
    where: { sizeId },
    _sum: { delta: true },
  });
  return _sum.delta ?? EMPTY_LEDGER_TOTAL;
};

describe("inventory ledger", () => {
  it("records a new product's opening stock and announces it", async () => {
    const { authHeader } = await createBrandOwner();

    const { productId, sizeId } = await createProductThroughApi(authHeader);

    const entries = await prisma.inventoryLedgerEntry.findMany({ where: { sizeId } });
    expect(entries).toMatchObject([
      {
        kind: InventoryMovementKind.SIZE_CREATED,
        sourceType: InventoryMovementSource.PRODUCT_SIZE,
        sourceId: productId,
        delta: INITIAL_STOCK,
      },
    ]);
    expect(
      await prisma.outboxEvent.count({
        where: { topic: OUTBOX_TOPIC.STOCK_CHANGED, aggregateId: productId },
      }),
    ).toBe(1);
  });

  it("records a brand's restock, and nothing at all for a refused adjustment", async () => {
    const { authHeader } = await createBrandOwner();
    const { productId, sizeId } = await createProductThroughApi(authHeader);

    const restock = await request(testApp)
      .patch(`/api/products/${productId}/stock`)
      .set("Authorization", authHeader)
      .send({ adjustments: [{ sizeId, delta: RESTOCK_AMOUNT }] });
    const overdraw = await request(testApp)
      .patch(`/api/products/${productId}/stock`)
      .set("Authorization", authHeader)
      .send({ adjustments: [{ sizeId, delta: -(INITIAL_STOCK + RESTOCK_AMOUNT + 1) }] });

    expect(restock.status).toBe(HTTP_STATUS.OK);
    expect(overdraw.status).toBe(HTTP_STATUS.BAD_REQUEST);
    const adjustments = await prisma.inventoryLedgerEntry.findMany({
      where: { sizeId, kind: InventoryMovementKind.BRAND_ADJUSTMENT },
    });
    expect(adjustments.map(({ delta }) => delta)).toEqual([RESTOCK_AMOUNT]);
    expect(await ledgerTotalFor(sizeId)).toBe(INITIAL_STOCK + RESTOCK_AMOUNT);
  });

  it("refuses an adjustment that names the same size twice", async () => {
    const { authHeader } = await createBrandOwner();
    const { productId, sizeId } = await createProductThroughApi(authHeader);

    const response = await request(testApp)
      .patch(`/api/products/${productId}/stock`)
      .set("Authorization", authHeader)
      .send({
        adjustments: [
          { sizeId, delta: 1 },
          { sizeId, delta: 1 },
        ],
      });

    expect(response.status).toBeGreaterThanOrEqual(HTTP_STATUS.BAD_REQUEST);
    expect(response.status).toBeLessThan(HTTP_STATUS.INTERNAL_SERVER_ERROR);
  });

  it("sells exactly the stock there is when more buyers race for it, and the ledger agrees", async () => {
    const size = await createSizeWithStock(OVERSELL_STOCK);
    await runInventoryLedgerReconciliation();

    const outcomes = await Promise.allSettled(
      Array.from({ length: OVERSELL_BUYER_COUNT }, () => buyOneUnit(size.id)),
    );

    const successfulSales = outcomes.filter((outcome) => outcome.status === "fulfilled");
    expect(successfulSales).toHaveLength(OVERSELL_STOCK);
    const soldOutSize = await prisma.productSize.findUniqueOrThrow({ where: { id: size.id } });
    expect(soldOutSize.stock).toBe(0);
    expect(await ledgerTotalFor(size.id)).toBe(0);
    expect(await runInventoryLedgerReconciliation()).toEqual({
      mismatchedSizeCount: 0,
      adoptedUntrackedSizeCount: 0,
    });
  });

  it("refuses to apply the same stock movement twice", async () => {
    const size = await createSizeWithStock(INITIAL_STOCK);
    const orderId = randomUUID();
    await buyOneUnit(size.id, orderId);

    await expect(buyOneUnit(size.id, orderId)).rejects.toThrow();

    const afterReplay = await prisma.productSize.findUniqueOrThrow({ where: { id: size.id } });
    expect(afterReplay.stock).toBe(INITIAL_STOCK - SINGLE_UNIT);
  });

  it("never lets stock go below zero, even from a direct write", async () => {
    const size = await createSizeWithStock(0);

    const negativeWrite = prisma.productSize.update({
      where: { id: size.id },
      data: { stock: -1 },
    });

    const error = await negativeWrite.catch((caught: unknown) => caught);
    expect(isCheckConstraintViolation(error, STOCK_NON_NEGATIVE_CONSTRAINT)).toBe(true);
  });
});

describe("runInventoryLedgerReconciliation", () => {
  it("starts tracking sizes with no ledger history, then flags any size whose stock drifts", async () => {
    const size = await createSizeWithStock(INITIAL_STOCK);

    const firstRun = await runInventoryLedgerReconciliation();
    await prisma.productSize.update({ where: { id: size.id }, data: { stock: INITIAL_STOCK + 1 } });
    const secondRun = await runInventoryLedgerReconciliation();

    expect(firstRun).toEqual({ mismatchedSizeCount: 0, adoptedUntrackedSizeCount: 1 });
    expect(secondRun).toEqual({ mismatchedSizeCount: 1, adoptedUntrackedSizeCount: 0 });
  });
});
