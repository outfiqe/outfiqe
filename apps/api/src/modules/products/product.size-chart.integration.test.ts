import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { InventoryMovementKind, ProductStatus } from "#generated/prisma/enums.js";
import {
  type BrandOwnerSession,
  createBrandOwnerSession,
} from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const PRODUCTS_PATH = "/api/products";
const OK_STATUS = 200;
const CREATED_STATUS = 201;
const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;
const INITIAL_STOCK = 5;

const MEDIUM_FIT_RANGE = { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 };
const LARGE_FIT_RANGE = { minHeightCm: 168, maxHeightCm: 178, minWeightKg: 63, maxWeightKg: 75 };
const SMALL_FIT_RANGE = { minHeightCm: 150, maxHeightCm: 161, minWeightKg: 45, maxWeightKg: 56 };

type StandardLabels = { standardId: string; labelIdByLabel: Map<string, string> };

type BrandSizeResponse = {
  id: string;
  label: string;
  stock: number;
  fitRange: typeof MEDIUM_FIT_RANGE | null;
};

const createProductType = async (supportsFitRanges: boolean) => {
  const slug = `chart-${randomUUID().slice(0, 8)}`;
  await prisma.productType.create({ data: { slug, label: "Chart type", supportsFitRanges } });
  return slug;
};

const createCategory = async () => {
  const slug = `chart-cat-${randomUUID().slice(0, 8)}`;
  await prisma.category.create({ data: { slug, name: "Chart Category" } });
  return slug;
};

const createStandard = async (
  { authHeader }: BrandOwnerSession,
  labels: string[],
): Promise<StandardLabels> => {
  const response = await request(testApp)
    .post("/api/size-standards")
    .set("Authorization", authHeader)
    .send({ name: `Letter ${randomUUID().slice(0, 4)}`, labels });
  const { id, labels: createdLabels } = response.body.data as {
    id: string;
    labels: { id: string; label: string }[];
  };
  return {
    standardId: id,
    labelIdByLabel: new Map(createdLabels.map(({ id: labelId, label }) => [label, labelId])),
  };
};

const labelIdFor = ({ labelIdByLabel }: StandardLabels, label: string): string => {
  const labelId = labelIdByLabel.get(label);
  if (!labelId) throw new Error(`No label ${label}`);
  return labelId;
};

const postProduct = async (session: BrandOwnerSession, productBody: Record<string, unknown>) =>
  request(testApp)
    .post(PRODUCTS_PATH)
    .set("Authorization", session.authHeader)
    .send({
      name: "Chart Kurta",
      price: 2_500,
      type: await createProductType(true),
      categories: [await createCategory()],
      ...productBody,
    });

const createChartedProduct = async (session: BrandOwnerSession) => {
  const standard = await createStandard(session, ["S", "M", "L"]);
  const response = await postProduct(session, {
    sizeStandardId: standard.standardId,
    isStretchable: true,
    sizes: [
      {
        standardLabelId: labelIdFor(standard, "M"),
        stock: INITIAL_STOCK,
        fitRange: MEDIUM_FIT_RANGE,
      },
      {
        standardLabelId: labelIdFor(standard, "L"),
        stock: INITIAL_STOCK,
        fitRange: LARGE_FIT_RANGE,
      },
    ],
  });
  expect(response.status).toBe(CREATED_STATUS);
  return { standard, product: response.body.data as { id: string; sizes: BrandSizeResponse[] } };
};

describe("creating a product from a brand size standard", () => {
  it("copies the picked sizes in the standard's order with their ranges and stretch", async () => {
    const session = await createBrandOwnerSession();
    const standard = await createStandard(session, ["S", "M", "L"]);

    const response = await postProduct(session, {
      sizeStandardId: standard.standardId,
      isStretchable: false,
      sizes: [
        { standardLabelId: labelIdFor(standard, "L"), stock: 2, fitRange: LARGE_FIT_RANGE },
        { standardLabelId: labelIdFor(standard, "S"), stock: 4, fitRange: SMALL_FIT_RANGE },
      ],
    });

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data).toMatchObject({
      sizeStandardId: standard.standardId,
      isStretchable: false,
      sizes: [
        { label: "S", stock: 4, fitRange: SMALL_FIT_RANGE },
        { label: "L", stock: 2, fitRange: LARGE_FIT_RANGE },
      ],
    });

    const [smallSize] = response.body.data.sizes as BrandSizeResponse[];
    const ledgerEntries = await prisma.inventoryLedgerEntry.findMany({
      where: { sizeId: smallSize?.id },
    });
    expect(ledgerEntries).toMatchObject([{ kind: InventoryMovementKind.SIZE_CREATED, delta: 4 }]);
  });

  it("accepts sizes without a range", async () => {
    const session = await createBrandOwnerSession();
    const standard = await createStandard(session, ["Free size"]);

    const response = await postProduct(session, {
      sizeStandardId: standard.standardId,
      sizes: [{ standardLabelId: labelIdFor(standard, "Free size"), stock: 1 }],
    });

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.sizes).toMatchObject([{ label: "Free size", fitRange: null }]);
  });

  it("refuses sizes from another brand's standard", async () => {
    const owner = await createBrandOwnerSession();
    const otherBrand = await createBrandOwnerSession();
    const otherStandard = await createStandard(otherBrand, ["M"]);

    const response = await postProduct(owner, {
      sizeStandardId: otherStandard.standardId,
      sizes: [{ standardLabelId: labelIdFor(otherStandard, "M"), stock: 1 }],
    });

    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(response.body.code).toBe("SIZE_STANDARD_NOT_FOUND");
  });

  it.each([
    ["standard sizes without their sizeStandardId", false, false],
    ["the same size picked twice", true, true],
  ])("refuses %s", async (_description, sendStandardId, pickTwice) => {
    const session = await createBrandOwnerSession();
    const standard = await createStandard(session, ["M"]);
    const mediumSize = { standardLabelId: labelIdFor(standard, "M"), stock: 1 };

    const response = await postProduct(session, {
      sizeStandardId: sendStandardId ? standard.standardId : undefined,
      sizes: pickTwice ? [mediumSize, mediumSize] : [mediumSize],
    });

    expect(response.status).toBe(UNPROCESSABLE_STATUS);
  });

  it("refuses a range whose minimum is above its maximum", async () => {
    const session = await createBrandOwnerSession();
    const standard = await createStandard(session, ["M"]);

    const response = await postProduct(session, {
      sizeStandardId: standard.standardId,
      sizes: [
        {
          standardLabelId: labelIdFor(standard, "M"),
          stock: 1,
          fitRange: { ...MEDIUM_FIT_RANGE, minWeightKg: 80 },
        },
      ],
    });

    expect(response.status).toBe(UNPROCESSABLE_STATUS);
  });

  it("refuses a size chart or stretch on a type that doesn't take one, but accepts plain sizes", async () => {
    const session = await createBrandOwnerSession();
    const standard = await createStandard(session, ["One size"]);
    const accessoryType = await createProductType(false);
    const oneSize = { standardLabelId: labelIdFor(standard, "One size"), stock: 1 };

    const withChart = await postProduct(session, {
      type: accessoryType,
      sizeStandardId: standard.standardId,
      sizes: [{ ...oneSize, fitRange: MEDIUM_FIT_RANGE }],
    });
    const withStretch = await postProduct(session, {
      type: accessoryType,
      sizeStandardId: standard.standardId,
      isStretchable: true,
      sizes: [oneSize],
    });
    const plain = await postProduct(session, {
      type: accessoryType,
      sizeStandardId: standard.standardId,
      sizes: [oneSize],
    });

    expect(withChart.status).toBe(UNPROCESSABLE_STATUS);
    expect(withChart.body.code).toBe("FIT_RANGES_NOT_SUPPORTED");
    expect(withStretch.status).toBe(UNPROCESSABLE_STATUS);
    expect(plain.status).toBe(CREATED_STATUS);
  });
});

describe("PUT /api/products/:id/size-chart", () => {
  it("edits ranges and stretch on the existing sizes without replacing them", async () => {
    const session = await createBrandOwnerSession();
    const { product } = await createChartedProduct(session);
    const [mediumSize, largeSize] = product.sizes;
    if (!mediumSize || !largeSize) throw new Error("Fixture sizes missing");

    const response = await request(testApp)
      .put(`${PRODUCTS_PATH}/${product.id}/size-chart`)
      .set("Authorization", session.authHeader)
      .send({
        isStretchable: false,
        sizes: [
          { sizeId: mediumSize.id, fitRange: { ...MEDIUM_FIT_RANGE, maxWeightKg: 66 } },
          { sizeId: largeSize.id, fitRange: null },
        ],
      });

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toMatchObject({
      isStretchable: false,
      sizes: [
        { id: mediumSize.id, fitRange: { ...MEDIUM_FIT_RANGE, maxWeightKg: 66 } },
        { id: largeSize.id, fitRange: null },
      ],
    });
  });

  it("returns 404 for another brand's product", async () => {
    const owner = await createBrandOwnerSession();
    const otherBrand = await createBrandOwnerSession();
    const { product } = await createChartedProduct(owner);

    const response = await request(testApp)
      .put(`${PRODUCTS_PATH}/${product.id}/size-chart`)
      .set("Authorization", otherBrand.authHeader)
      .send({ isStretchable: true, sizes: [{ sizeId: product.sizes[0]?.id, fitRange: null }] });

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });

  it("changes nothing when one of the sizes belongs to another product", async () => {
    const session = await createBrandOwnerSession();
    const { product } = await createChartedProduct(session);
    const { product: otherProduct } = await createChartedProduct(session);
    const [mediumSize] = product.sizes;
    const [foreignSize] = otherProduct.sizes;
    if (!mediumSize || !foreignSize) throw new Error("Fixture sizes missing");

    const response = await request(testApp)
      .put(`${PRODUCTS_PATH}/${product.id}/size-chart`)
      .set("Authorization", session.authHeader)
      .send({
        isStretchable: false,
        sizes: [
          { sizeId: mediumSize.id, fitRange: null },
          { sizeId: foreignSize.id, fitRange: null },
        ],
      });

    expect(response.status).toBe(NOT_FOUND_STATUS);
    expect(response.body.code).toBe("SIZE_NOT_FOUND");
    const storedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { isStretchable: true, sizes: { where: { id: mediumSize.id } } },
    });
    expect(storedProduct.isStretchable).toBe(true);
    expect(storedProduct.sizes[0]?.minHeightCm).toBe(MEDIUM_FIT_RANGE.minHeightCm);
  });

  it("refuses a chart on a type that doesn't take one", async () => {
    const session = await createBrandOwnerSession();
    const standard = await createStandard(session, ["One size"]);
    const created = await postProduct(session, {
      type: await createProductType(false),
      sizeStandardId: standard.standardId,
      sizes: [{ standardLabelId: labelIdFor(standard, "One size"), stock: 1 }],
    });
    const productId: string = created.body.data.id;
    const [oneSize] = created.body.data.sizes as BrandSizeResponse[];

    const response = await request(testApp)
      .put(`${PRODUCTS_PATH}/${productId}/size-chart`)
      .set("Authorization", session.authHeader)
      .send({ isStretchable: null, sizes: [{ sizeId: oneSize?.id, fitRange: MEDIUM_FIT_RANGE }] });

    expect(response.status).toBe(UNPROCESSABLE_STATUS);
    expect(response.body.code).toBe("FIT_RANGES_NOT_SUPPORTED");
  });
});

describe("PATCH /api/products/:id stretch handling", () => {
  it("updates stretch on its own for a type that takes a chart", async () => {
    const session = await createBrandOwnerSession();
    const { product } = await createChartedProduct(session);

    const response = await request(testApp)
      .patch(`${PRODUCTS_PATH}/${product.id}`)
      .set("Authorization", session.authHeader)
      .send({ isStretchable: false });

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.isStretchable).toBe(false);
  });

  it("clears stretch and takes new sizes when the type changes to one without charts", async () => {
    const session = await createBrandOwnerSession();
    const { standard, product } = await createChartedProduct(session);

    const response = await request(testApp)
      .patch(`${PRODUCTS_PATH}/${product.id}`)
      .set("Authorization", session.authHeader)
      .send({
        type: await createProductType(false),
        sizeStandardId: standard.standardId,
        sizes: [{ standardLabelId: labelIdFor(standard, "S"), stock: 3 }],
      });

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toMatchObject({
      isStretchable: null,
      sizes: [{ label: "S", stock: 3, fitRange: null }],
    });
  });

  it("refuses stretch on a type that doesn't take one", async () => {
    const session = await createBrandOwnerSession();
    const standard = await createStandard(session, ["One size"]);
    const created = await postProduct(session, {
      type: await createProductType(false),
      sizeStandardId: standard.standardId,
      sizes: [{ standardLabelId: labelIdFor(standard, "One size"), stock: 1 }],
    });

    const response = await request(testApp)
      .patch(`${PRODUCTS_PATH}/${created.body.data.id}`)
      .set("Authorization", session.authHeader)
      .send({ isStretchable: true });

    expect(response.status).toBe(UNPROCESSABLE_STATUS);
  });
});

describe("GET /api/products/:id size chart", () => {
  const approve = (productId: string) =>
    prisma.product.update({ where: { id: productId }, data: { status: ProductStatus.APPROVED } });

  it("shows the chart and stretch when every size has a range", async () => {
    const session = await createBrandOwnerSession();
    const { product } = await createChartedProduct(session);
    await approve(product.id);

    const response = await request(testApp).get(`${PRODUCTS_PATH}/${product.id}`);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toMatchObject({
      isStretchable: true,
      hasSizeChart: true,
      sizes: [
        { label: "M", inStock: true, fitRange: MEDIUM_FIT_RANGE },
        { label: "L", inStock: true, fitRange: LARGE_FIT_RANGE },
      ],
    });
  });

  it("reports no complete chart when a size is missing its range", async () => {
    const session = await createBrandOwnerSession();
    const { product } = await createChartedProduct(session);
    await prisma.productSize.updateMany({
      where: { productId: product.id, label: "L" },
      data: { minHeightCm: null, maxHeightCm: null, minWeightKg: null, maxWeightKg: null },
    });
    await approve(product.id);

    const response = await request(testApp).get(`${PRODUCTS_PATH}/${product.id}`);

    expect(response.body.data.hasSizeChart).toBe(false);
    expect(response.body.data.sizes[1].fitRange).toBeNull();
  });

  it("hides stored ranges and stretch once an admin turns charts off for the type", async () => {
    const session = await createBrandOwnerSession();
    const { product } = await createChartedProduct(session);
    const storedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { productTypeId: true },
    });
    await prisma.productType.update({
      where: { id: storedProduct.productTypeId },
      data: { supportsFitRanges: false },
    });
    await approve(product.id);

    const response = await request(testApp).get(`${PRODUCTS_PATH}/${product.id}`);

    expect(response.body.data).toMatchObject({
      isStretchable: null,
      hasSizeChart: false,
      sizes: [{ fitRange: null }, { fitRange: null }],
    });
  });
});
