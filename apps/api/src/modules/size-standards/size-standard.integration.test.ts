import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { createBrandOwnerSession, ensureProductType } from "#test/integration/product-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { sizeStandardService } from "./size-standard.service.js";

const SIZE_STANDARDS_PATH = "/api/size-standards";
const OK_STATUS = 200;
const CREATED_STATUS = 201;
const UNPROCESSABLE_STATUS = 422;
const UNAUTHORIZED_STATUS = 401;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

type SizeStandardResponse = {
  id: string;
  name: string;
  labels: { id: string; label: string }[];
};

const createStandard = async (authHeader: string, name: string, labels: string[]) => {
  const response = await request(testApp)
    .post(SIZE_STANDARDS_PATH)
    .set("Authorization", authHeader)
    .send({ name, labels });
  return response;
};

const labelsOf = (standard: SizeStandardResponse): string[] =>
  standard.labels.map(({ label }) => label);

describe("size standards API", () => {
  it("requires a signed-in brand owner", async () => {
    const response = await request(testApp).get(SIZE_STANDARDS_PATH);
    expect(response.status).toBe(UNAUTHORIZED_STATUS);
  });

  it("creates a standard with its sizes in the order given and lists it", async () => {
    const { authHeader } = await createBrandOwnerSession();

    const createResponse = await createStandard(authHeader, "Tops – letter", [" S", "M ", "L"]);
    expect(createResponse.status).toBe(CREATED_STATUS);
    const createdStandard: SizeStandardResponse = createResponse.body.data;
    expect(createdStandard.name).toBe("Tops – letter");
    expect(labelsOf(createdStandard)).toEqual(["S", "M", "L"]);

    const listResponse = await request(testApp)
      .get(SIZE_STANDARDS_PATH)
      .set("Authorization", authHeader);
    expect(listResponse.status).toBe(OK_STATUS);
    expect(listResponse.body.data).toEqual([createdStandard]);
  });

  it.each([
    ["no sizes", []],
    ["the same size twice, ignoring case", ["M", "m"]],
    ["a size longer than 12 characters", ["Extra extra large"]],
  ])("refuses a standard with %s", async (_description, labels) => {
    const { authHeader } = await createBrandOwnerSession();
    const response = await createStandard(authHeader, "Broken", labels);
    expect(response.status).toBe(UNPROCESSABLE_STATUS);
  });

  it("refuses a second active standard with the same name", async () => {
    const { authHeader } = await createBrandOwnerSession();
    await createStandard(authHeader, "Waist", ["28", "30"]);

    const response = await createStandard(authHeader, "Waist", ["32"]);
    expect(response.status).toBe(CONFLICT_STATUS);
    expect(response.body.code).toBe("SIZE_STANDARD_NAME_TAKEN");
  });

  it("lets two brands use the same standard name", async () => {
    const firstBrand = await createBrandOwnerSession();
    const secondBrand = await createBrandOwnerSession();
    await createStandard(firstBrand.authHeader, "Letter", ["M"]);

    const response = await createStandard(secondBrand.authHeader, "Letter", ["M"]);
    expect(response.status).toBe(CREATED_STATUS);
  });

  it("renames, reorders, adds and removes sizes while keeping the ids of sizes it keeps", async () => {
    const { authHeader } = await createBrandOwnerSession();
    const createdStandard: SizeStandardResponse = (
      await createStandard(authHeader, "Letter", ["S", "M", "L"])
    ).body.data;
    const mediumLabelId = createdStandard.labels.find(({ label }) => label === "M")?.id;

    const response = await request(testApp)
      .patch(`${SIZE_STANDARDS_PATH}/${createdStandard.id}`)
      .set("Authorization", authHeader)
      .send({ name: "Letter sizes", labels: ["XL", "M", "S"] });

    expect(response.status).toBe(OK_STATUS);
    const updatedStandard: SizeStandardResponse = response.body.data;
    expect(updatedStandard.name).toBe("Letter sizes");
    expect(labelsOf(updatedStandard)).toEqual(["XL", "M", "S"]);
    expect(updatedStandard.labels.find(({ label }) => label === "M")?.id).toBe(mediumLabelId);
  });

  it("refuses an empty update", async () => {
    const { authHeader } = await createBrandOwnerSession();
    const createdStandard: SizeStandardResponse = (
      await createStandard(authHeader, "Letter", ["M"])
    ).body.data;

    const response = await request(testApp)
      .patch(`${SIZE_STANDARDS_PATH}/${createdStandard.id}`)
      .set("Authorization", authHeader)
      .send({});
    expect(response.status).toBe(UNPROCESSABLE_STATUS);
  });

  it("returns 404 when another brand tries to read, change or archive a standard", async () => {
    const owner = await createBrandOwnerSession();
    const otherBrand = await createBrandOwnerSession();
    const createdStandard: SizeStandardResponse = (
      await createStandard(owner.authHeader, "Private", ["M"])
    ).body.data;

    const updateResponse = await request(testApp)
      .patch(`${SIZE_STANDARDS_PATH}/${createdStandard.id}`)
      .set("Authorization", otherBrand.authHeader)
      .send({ name: "Taken over" });
    const archiveResponse = await request(testApp)
      .delete(`${SIZE_STANDARDS_PATH}/${createdStandard.id}`)
      .set("Authorization", otherBrand.authHeader);
    const otherBrandList = await request(testApp)
      .get(SIZE_STANDARDS_PATH)
      .set("Authorization", otherBrand.authHeader);

    expect(updateResponse.status).toBe(NOT_FOUND_STATUS);
    expect(archiveResponse.status).toBe(NOT_FOUND_STATUS);
    expect(otherBrandList.body.data).toEqual([]);
  });

  it("archives a standard without touching products that used it, and frees its name", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const createdStandard: SizeStandardResponse = (
      await createStandard(authHeader, "Letter", ["M"])
    ).body.data;
    const productTypeId = await ensureProductType();
    const product = await prisma.product.create({
      data: {
        brandId,
        productTypeId,
        name: "Archive Tee",
        price: 1_500,
        sizeStandardId: createdStandard.id,
        sizes: { create: [{ label: "M", stock: 3 }] },
      },
      select: { id: true },
    });

    const archiveResponse = await request(testApp)
      .delete(`${SIZE_STANDARDS_PATH}/${createdStandard.id}`)
      .set("Authorization", authHeader);
    expect(archiveResponse.status).toBe(OK_STATUS);

    const listAfterArchive = await request(testApp)
      .get(SIZE_STANDARDS_PATH)
      .set("Authorization", authHeader);
    expect(listAfterArchive.body.data).toEqual([]);

    const productAfterArchive = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { sizeStandardId: true, sizes: { select: { label: true } } },
    });
    expect(productAfterArchive).toEqual({
      sizeStandardId: createdStandard.id,
      sizes: [{ label: "M" }],
    });

    const recreateResponse = await createStandard(authHeader, "Letter", ["M", "L"]);
    expect(recreateResponse.status).toBe(CREATED_STATUS);

    const secondArchiveResponse = await request(testApp)
      .delete(`${SIZE_STANDARDS_PATH}/${createdStandard.id}`)
      .set("Authorization", authHeader);
    expect(secondArchiveResponse.status).toBe(NOT_FOUND_STATUS);
  });
});

describe("sizeStandardService.getOwnedLabelsInStandardOrder", () => {
  it("returns the picked sizes in the standard's order, whatever order they were picked in", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const createdStandard: SizeStandardResponse = (
      await createStandard(authHeader, "Letter", ["S", "M", "L"])
    ).body.data;
    const labelIdsLargestFirst = [...createdStandard.labels].reverse().map(({ id }) => id);

    const ownedLabels = await sizeStandardService.getOwnedLabelsInStandardOrder(
      brandId,
      createdStandard.id,
      labelIdsLargestFirst,
    );

    expect(ownedLabels.map(({ label }) => label)).toEqual(["S", "M", "L"]);
  });

  it("refuses a size from another brand's standard", async () => {
    const owner = await createBrandOwnerSession();
    const otherBrand = await createBrandOwnerSession();
    const createdStandard: SizeStandardResponse = (
      await createStandard(owner.authHeader, "Letter", ["M"])
    ).body.data;

    await expect(
      sizeStandardService.getOwnedLabelsInStandardOrder(
        otherBrand.brandId,
        createdStandard.id,
        createdStandard.labels.map(({ id }) => id),
      ),
    ).rejects.toMatchObject({ code: "SIZE_STANDARD_NOT_FOUND", status: NOT_FOUND_STATUS });
  });

  it("refuses sizes from an archived standard", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const createdStandard: SizeStandardResponse = (
      await createStandard(authHeader, "Letter", ["M"])
    ).body.data;
    await request(testApp)
      .delete(`${SIZE_STANDARDS_PATH}/${createdStandard.id}`)
      .set("Authorization", authHeader);

    await expect(
      sizeStandardService.getOwnedLabelsInStandardOrder(
        brandId,
        createdStandard.id,
        createdStandard.labels.map(({ id }) => id),
      ),
    ).rejects.toMatchObject({ code: "SIZE_STANDARD_NOT_FOUND" });
  });
});
