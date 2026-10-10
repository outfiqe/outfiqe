import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { isCheckConstraintViolation } from "#lib/prisma.utils.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const FIT_RANGE_COMPLETE_CONSTRAINT = "product_sizes_fit_range_complete";
const FIT_RANGE_VALID_CONSTRAINT = "product_sizes_fit_range_valid";
const FIT_PROFILE_VALID_CONSTRAINT = "user_fit_profiles_measurements_valid";
const MIGRATION_DIRECTORY_SUFFIX = "_add_brand_size_standards_and_fit_ranges";
const BACKFILL_START_MARKER = 'CREATE TEMPORARY TABLE "size_standard_backfill"';
const STATEMENT_SEPARATOR = ";";

const VALID_FIT_RANGE = { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 };

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../prisma/migrations",
);

const readBackfillStatements = (): string[] => {
  const [migrationDirectoryName] = readdirSync(migrationsDirectory).filter((directoryName) =>
    directoryName.endsWith(MIGRATION_DIRECTORY_SUFFIX),
  );
  if (!migrationDirectoryName) throw new Error("Size standard migration not found");

  const migrationSql = readFileSync(
    path.join(migrationsDirectory, migrationDirectoryName, "migration.sql"),
    "utf8",
  );
  return migrationSql
    .slice(migrationSql.indexOf(BACKFILL_START_MARKER))
    .split(STATEMENT_SEPARATOR)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
};

const runSizeStandardBackfill = async (): Promise<void> => {
  const backfillStatements = readBackfillStatements();
  await prisma.$transaction(async (transaction) => {
    for (const statement of backfillStatements) {
      await transaction.$executeRawUnsafe(statement);
    }
  });
};

const createBrand = async (name: string) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createProductType = async (label: string) =>
  prisma.productType.create({
    data: { slug: `fit-${randomUUID().slice(0, 8)}`, label },
    select: { id: true },
  });

const createProduct = async (
  brandId: string,
  productTypeId: string,
  sizes: { label: string; sortOrder: number }[],
) =>
  prisma.product.create({
    data: {
      brandId,
      productTypeId,
      name: `Fit product ${randomUUID().slice(0, 6)}`,
      price: 2_000,
      status: ProductStatus.APPROVED,
      sizes: { create: sizes },
    },
    select: { id: true, sizes: { select: { id: true } } },
  });

const createCustomer = async () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Fit Shopper",
      handle: `fit-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });

const expectCheckViolation = async (write: Promise<unknown>, constraintName: string) => {
  const writeError = await write.then(
    () => null,
    (error: unknown) => error,
  );
  expect(isCheckConstraintViolation(writeError, constraintName)).toBe(true);
};

describe("product size fit-range constraints", () => {
  const createSingleSize = async () => {
    const brand = await createBrand("Constraint Brand");
    const { id: productTypeId } = await createProductType("Tops");
    const {
      sizes: [size],
    } = await createProduct(brand.id, productTypeId, [{ label: "M", sortOrder: 0 }]);
    if (!size) throw new Error("Fixture size missing");
    return size.id;
  };

  it("accepts a complete, ordered range", async () => {
    const sizeId = await createSingleSize();
    const updatedSize = await prisma.productSize.update({
      where: { id: sizeId },
      data: VALID_FIT_RANGE,
    });
    expect(updatedSize).toMatchObject(VALID_FIT_RANGE);
  });

  it("rejects a range with only some of its ends set", async () => {
    const sizeId = await createSingleSize();
    await expectCheckViolation(
      prisma.productSize.update({
        where: { id: sizeId },
        data: { minHeightCm: 160, maxHeightCm: 170 },
      }),
      FIT_RANGE_COMPLETE_CONSTRAINT,
    );
  });

  it.each([
    ["an inverted height range", { ...VALID_FIT_RANGE, minHeightCm: 175 }],
    ["an inverted weight range", { ...VALID_FIT_RANGE, maxWeightKg: 50 }],
    ["a height below the floor", { ...VALID_FIT_RANGE, minHeightCm: 40 }],
    ["a weight above the ceiling", { ...VALID_FIT_RANGE, maxWeightKg: 250 }],
  ])("rejects %s", async (_description, fitRange) => {
    const sizeId = await createSingleSize();
    await expectCheckViolation(
      prisma.productSize.update({ where: { id: sizeId }, data: fitRange }),
      FIT_RANGE_VALID_CONSTRAINT,
    );
  });
});

describe("user fit profile constraints", () => {
  it("stores measurements inside the bounds", async () => {
    const customer = await createCustomer();
    const fitProfile = await prisma.userFitProfile.create({
      data: { userId: customer.id, heightCm: 170, weightKg: 65 },
    });
    expect(fitProfile).toMatchObject({ heightCm: 170, weightKg: 65 });
  });

  it("rejects measurements outside the bounds", async () => {
    const customer = await createCustomer();
    await expectCheckViolation(
      prisma.userFitProfile.create({ data: { userId: customer.id, heightCm: 300, weightKg: 65 } }),
      FIT_PROFILE_VALID_CONSTRAINT,
    );
  });
});

describe("size standard backfill", () => {
  it("gives each brand one standard per product type, holding the labels its products use", async () => {
    const firstBrand = await createBrand("Backfill Brand One");
    const secondBrand = await createBrand("Backfill Brand Two");
    const { id: topsTypeId } = await createProductType("Tops");
    const { id: sareeTypeId } = await createProductType("Saree");
    await prisma.sizeOption.createMany({
      data: ["S", "M", "L"].map((label, sortOrder) => ({
        productTypeId: topsTypeId,
        label,
        sortOrder,
      })),
    });

    const firstTop = await createProduct(firstBrand.id, topsTypeId, [
      { label: "M", sortOrder: 0 },
      { label: "L", sortOrder: 1 },
    ]);
    const secondTop = await createProduct(firstBrand.id, topsTypeId, [
      { label: "S", sortOrder: 0 },
      { label: "M", sortOrder: 1 },
    ]);
    const saree = await createProduct(firstBrand.id, sareeTypeId, [
      { label: "Free size", sortOrder: 0 },
    ]);
    const otherBrandTop = await createProduct(secondBrand.id, topsTypeId, [
      { label: "XS", sortOrder: 0 },
    ]);
    const productWithoutSizes = await createProduct(firstBrand.id, topsTypeId, []);

    await runSizeStandardBackfill();

    const firstBrandStandards = await prisma.brandSizeStandard.findMany({
      where: { brandId: firstBrand.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        labels: { orderBy: { sortOrder: "asc" }, select: { label: true } },
      },
    });
    expect(firstBrandStandards).toEqual([
      { id: expect.any(String), name: "Saree sizes", labels: [{ label: "Free size" }] },
      {
        id: expect.any(String),
        name: "Tops sizes",
        labels: [{ label: "S" }, { label: "M" }, { label: "L" }],
      },
    ]);

    const [sareeStandard, topsStandard] = firstBrandStandards;
    const linkedProducts = await prisma.product.findMany({
      where: {
        id: {
          in: [firstTop.id, secondTop.id, saree.id, otherBrandTop.id, productWithoutSizes.id],
        },
      },
      select: { id: true, sizeStandardId: true },
    });
    const sizeStandardIdByProductId = new Map(
      linkedProducts.map(({ id, sizeStandardId }) => [id, sizeStandardId]),
    );

    expect(sizeStandardIdByProductId.get(firstTop.id)).toBe(topsStandard?.id);
    expect(sizeStandardIdByProductId.get(secondTop.id)).toBe(topsStandard?.id);
    expect(sizeStandardIdByProductId.get(saree.id)).toBe(sareeStandard?.id);
    expect(sizeStandardIdByProductId.get(productWithoutSizes.id)).toBe(topsStandard?.id);

    const otherBrandStandard = await prisma.brandSizeStandard.findFirstOrThrow({
      where: { brandId: secondBrand.id },
      select: { id: true, labels: { select: { label: true } } },
    });
    expect(otherBrandStandard.labels).toEqual([{ label: "XS" }]);
    expect(sizeStandardIdByProductId.get(otherBrandTop.id)).toBe(otherBrandStandard.id);
  });

  it("disambiguates two product types that share a label for the same brand", async () => {
    const brand = await createBrand("Backfill Brand Duplicate");
    const { id: firstTypeId } = await createProductType("Shirts");
    const { id: secondTypeId } = await createProductType("Shirts");
    await createProduct(brand.id, firstTypeId, [{ label: "M", sortOrder: 0 }]);
    await createProduct(brand.id, secondTypeId, [{ label: "L", sortOrder: 0 }]);

    await runSizeStandardBackfill();

    const standardNames = await prisma.brandSizeStandard.findMany({
      where: { brandId: brand.id },
      select: { name: true },
    });
    expect(standardNames).toHaveLength(2);
    expect(standardNames.every(({ name }) => name.startsWith("Shirts sizes ("))).toBe(true);
  });
});
