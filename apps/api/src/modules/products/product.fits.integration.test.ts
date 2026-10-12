import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { AccountStatus, FeatureFlagRollout, ProductStatus } from "#generated/prisma/enums.js";
import { setFeatureFlagRollout } from "#test/integration/outfit-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

const FITS_PATH = "/api/products/fits";
const OK_STATUS = 200;
const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;
const TOO_MANY_REQUESTS_STATUS = 429;
const FIT_SEARCH_REQUESTS_PER_MINUTE = 60;
const ONE_EXTRA_REQUEST = 1;
const IN_STOCK = 4;
const SOLD_OUT = 0;

const MEDIUM_RANGE = { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 };
const LARGE_RANGE = { minHeightCm: 170, maxHeightCm: 180, minWeightKg: 65, maxWeightKg: 75 };

type SizeFixture = {
  label: string;
  stock: number;
  fitRange: typeof MEDIUM_RANGE | null;
};

type ProductFixture = {
  name: string;
  sizes: SizeFixture[];
  status?: ProductStatus;
  deletedAt?: Date;
  productTypeId?: string;
  brandId?: string;
  categoryId?: string;
};

type FittingProductResponse = {
  id: string;
  name: string;
  recommendedSize: { sizeId: string; label: string } | null;
};

const createBrand = async (accountStatus: AccountStatus = AccountStatus.ACTIVE) =>
  prisma.brand.create({
    data: {
      name: `Fit Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
      accountStatus,
    },
    select: { id: true },
  });

const createProductType = async (supportsFitRanges: boolean) =>
  prisma.productType.create({
    data: { slug: `fits-${randomUUID().slice(0, 8)}`, label: "Fit type", supportsFitRanges },
    select: { id: true, slug: true },
  });

const createCategory = async () =>
  prisma.category.create({
    data: { slug: `fits-cat-${randomUUID().slice(0, 8)}`, name: "Fit category" },
    select: { id: true, slug: true },
  });

let defaultBrandId: string;
let defaultTypeId: string;

const createProduct = async ({
  name,
  sizes,
  status = ProductStatus.APPROVED,
  deletedAt,
  productTypeId = defaultTypeId,
  brandId = defaultBrandId,
  categoryId,
}: ProductFixture) =>
  prisma.product.create({
    data: {
      name,
      price: 2_000,
      status,
      deletedAt,
      productTypeId,
      brandId,
      isStretchable: false,
      categories: categoryId ? { connect: { id: categoryId } } : undefined,
      sizes: {
        create: sizes.map(({ label, stock, fitRange }, sortOrder) => ({
          label,
          stock,
          sortOrder,
          ...(fitRange ?? {}),
        })),
      },
    },
    select: { id: true },
  });

const fetchFits = (query: string) => request(testApp).get(`${FITS_PATH}?${query}`);

const namesIn = (products: FittingProductResponse[]): string[] =>
  products.map(({ name }) => name).sort();

beforeEach(async () => {
  await setFeatureFlagRollout("size_fit", FeatureFlagRollout.EVERYONE);
  defaultBrandId = (await createBrand()).id;
  defaultTypeId = (await createProductType(true)).id;
});

describe("GET /api/products/fits", () => {
  it("is hidden while the size_fit feature is off", async () => {
    await setFeatureFlagRollout("size_fit", FeatureFlagRollout.OFF);

    const response = await fetchFits("heightCm=165&weightKg=60");

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });

  it("returns only live products with an in-stock size cut for the shopper, with that size", async () => {
    await createProduct({
      name: "Fits",
      sizes: [
        { label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE },
        { label: "L", stock: IN_STOCK, fitRange: LARGE_RANGE },
      ],
    });
    await createProduct({
      name: "No chart",
      sizes: [{ label: "M", stock: IN_STOCK, fitRange: null }],
    });
    await createProduct({
      name: "Fitting size sold out",
      sizes: [
        { label: "M", stock: SOLD_OUT, fitRange: MEDIUM_RANGE },
        { label: "L", stock: IN_STOCK, fitRange: LARGE_RANGE },
      ],
    });
    await createProduct({
      name: "Still in review",
      status: ProductStatus.PENDING,
      sizes: [{ label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE }],
    });
    await createProduct({
      name: "Deleted",
      deletedAt: new Date(),
      sizes: [{ label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE }],
    });
    await createProduct({
      name: "Type without charts",
      productTypeId: (await createProductType(false)).id,
      sizes: [{ label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE }],
    });
    await createProduct({
      name: "Suspended brand",
      brandId: (await createBrand(AccountStatus.SUSPENDED)).id,
      sizes: [{ label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE }],
    });

    const response = await fetchFits("heightCm=165&weightKg=60");

    expect(response.status).toBe(OK_STATUS);
    const { products, total } = response.body.data as {
      products: FittingProductResponse[];
      total: number;
    };
    expect(namesIn(products)).toEqual(["Fits"]);
    expect(total).toBe(1);
    expect(products[0]?.recommendedSize?.label).toBe("M");
  });

  it("treats both ends of a range as fitting", async () => {
    await createProduct({
      name: "Edge",
      sizes: [{ label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE }],
    });

    const atLowestEnds = await fetchFits("heightCm=160&weightKg=55");
    const atHighestEnds = await fetchFits("heightCm=170&weightKg=65");
    const justPast = await fetchFits("heightCm=171&weightKg=65");

    expect(atLowestEnds.body.data.products).toHaveLength(1);
    expect(atHighestEnds.body.data.products).toHaveLength(1);
    expect(justPast.body.data.products).toHaveLength(0);
  });

  it("recommends a different size per product, from each product's own chart", async () => {
    await createProduct({
      name: "Runs small",
      sizes: [
        { label: "M", stock: IN_STOCK, fitRange: { ...MEDIUM_RANGE, maxHeightCm: 164 } },
        {
          label: "L",
          stock: IN_STOCK,
          fitRange: { ...LARGE_RANGE, minHeightCm: 164, minWeightKg: 55 },
        },
      ],
    });
    await createProduct({
      name: "True to size",
      sizes: [{ label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE }],
    });

    const response = await fetchFits("heightCm=167&weightKg=60");

    const recommendedLabelByName = new Map(
      (response.body.data.products as FittingProductResponse[]).map(({ name, recommendedSize }) => [
        name,
        recommendedSize?.label,
      ]),
    );
    expect(recommendedLabelByName.get("Runs small")).toBe("L");
    expect(recommendedLabelByName.get("True to size")).toBe("M");
  });

  it("narrows by garment type and category", async () => {
    const otherType = await createProductType(true);
    const category = await createCategory();
    await createProduct({
      name: "Default type",
      sizes: [{ label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE }],
    });
    await createProduct({
      name: "Other type in category",
      productTypeId: otherType.id,
      categoryId: category.id,
      sizes: [{ label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE }],
    });

    const byType = await fetchFits(`heightCm=165&weightKg=60&type=${otherType.slug}`);
    const byCategory = await fetchFits(`heightCm=165&weightKg=60&category=${category.slug}`);

    expect(namesIn(byType.body.data.products)).toEqual(["Other type in category"]);
    expect(namesIn(byCategory.body.data.products)).toEqual(["Other type in category"]);
  });

  it("pages through results newest first with a cursor", async () => {
    for (const name of ["First", "Second", "Third"]) {
      await createProduct({
        name,
        sizes: [{ label: "M", stock: IN_STOCK, fitRange: MEDIUM_RANGE }],
      });
    }

    const firstPage = await fetchFits("heightCm=165&weightKg=60&limit=2");
    const { products: firstProducts, nextCursor } = firstPage.body.data as {
      products: FittingProductResponse[];
      nextCursor: string;
    };
    const secondPage = await fetchFits(`heightCm=165&weightKg=60&limit=2&cursor=${nextCursor}`);

    expect(firstProducts.map(({ name }) => name)).toEqual(["Third", "Second"]);
    expect(secondPage.body.data.products.map(({ name }: FittingProductResponse) => name)).toEqual([
      "First",
    ]);
    expect(secondPage.body.data.nextCursor).toBeNull();
  });

  it.each([
    ["a missing weight", "heightCm=165"],
    ["a height below 50 cm", "heightCm=40&weightKg=60"],
    ["a weight above 200 kg", "heightCm=165&weightKg=250"],
    ["a fractional height", "heightCm=165.5&weightKg=60"],
  ])("refuses %s", async (_description, query) => {
    const response = await fetchFits(query);
    expect(response.status).toBe(UNPROCESSABLE_STATUS);
  });

  it("slows down a client that searches too often", async () => {
    const attemptsOverTheLimit = Array.from(
      { length: FIT_SEARCH_REQUESTS_PER_MINUTE + ONE_EXTRA_REQUEST },
      (_unused, attemptIndex) => attemptIndex,
    );
    let lastStatus = OK_STATUS;
    for (const _attemptIndex of attemptsOverTheLimit) {
      lastStatus = (await fetchFits("heightCm=40&weightKg=60")).status;
    }
    expect(lastStatus).toBe(TOO_MANY_REQUESTS_STATUS);
  });
});
