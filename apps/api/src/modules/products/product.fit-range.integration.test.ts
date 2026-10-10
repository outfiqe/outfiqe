import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { isCheckConstraintViolation } from "#lib/prisma.utils.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const FIT_RANGE_COMPLETE_CONSTRAINT = "product_sizes_fit_range_complete";
const FIT_RANGE_VALID_CONSTRAINT = "product_sizes_fit_range_valid";
const FIT_PROFILE_VALID_CONSTRAINT = "user_fit_profiles_measurements_valid";

const VALID_FIT_RANGE = { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 };

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
