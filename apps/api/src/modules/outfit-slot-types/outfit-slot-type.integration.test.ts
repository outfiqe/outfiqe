import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import {
  createAdminSession,
  createRoleLimitedStaffSession,
} from "#test/integration/authHelpers.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const SLOT_TYPES_PATH = "/api/outfit-slot-types";
const VALIDATION_FAILED_STATUS = HTTP_STATUS.UNPROCESSABLE_ENTITY;

const uniqueSlotKey = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

const slotTypeBody = async (overrides: Record<string, unknown> = {}) => ({
  key: uniqueSlotKey("scarf"),
  label: "Scarf",
  icon: "accessory",
  maxItems: 1,
  productTypeIds: [await ensureProductType("accessories", "Accessories")],
  ...overrides,
});

const createSlotType = async (authHeader: string, overrides: Record<string, unknown> = {}) => {
  const response = await request(testApp)
    .post(SLOT_TYPES_PATH)
    .set("Authorization", authHeader)
    .send(await slotTypeBody(overrides));
  expect(response.status).toBe(201);
  return response.body.data;
};

const latestAuditEntryFor = (action: string, targetId: string) =>
  prisma.platformAuditLog.findFirst({
    where: { action, targetId },
    orderBy: { createdAt: "desc" },
  });

describe("GET /api/outfit-slot-types/admin", () => {
  it("lets a catalog reader list slot types, with blocks shown from both sides", async () => {
    const { authHeader: adminAuthHeader } = await createAdminSession();
    const topSlot = await createSlotType(adminAuthHeader, {
      key: uniqueSlotKey("top"),
      label: "Top",
    });
    await createSlotType(adminAuthHeader, {
      key: uniqueSlotKey("full-outfit"),
      label: "Full Outfit",
      blocksSlotTypeIds: [topSlot.id],
    });
    const { authHeader } = await createRoleLimitedStaffSession("platform:catalog:read");

    const response = await request(testApp)
      .get(`${SLOT_TYPES_PATH}/admin`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const listedTopSlot = response.body.data.find(
      (slotType: { id: string }) => slotType.id === topSlot.id,
    );
    expect(listedTopSlot.blockedBySlotTypes).toEqual([
      expect.objectContaining({ label: "Full Outfit" }),
    ]);
  });

  it("refuses a staffer without catalog access", async () => {
    const { authHeader } = await createRoleLimitedStaffSession("platform:audit:read");

    const response = await request(testApp)
      .get(`${SLOT_TYPES_PATH}/admin`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(403);
  });
});

describe("POST /api/outfit-slot-types", () => {
  it("creates a slot type at the end of the list and records it in the audit log", async () => {
    const { authHeader, userId } = await createAdminSession();
    const topSlotKey = uniqueSlotKey("top");
    const topSlotType = await createSlotType(authHeader, { key: topSlotKey, label: "Top" });

    const created = await createSlotType(authHeader, { blocksSlotTypeIds: [topSlotType.id] });

    expect(created).toMatchObject({
      label: "Scarf",
      icon: "accessory",
      maxItems: 1,
      acceptsAnyProductType: false,
      isActive: true,
      productTypes: [expect.objectContaining({ slug: "accessories" })],
      blocksSlotTypes: [expect.objectContaining({ key: topSlotKey })],
    });
    const { _max } = await prisma.outfitSlotType.aggregate({ _max: { sortOrder: true } });
    expect(created.sortOrder).toBe(_max.sortOrder);

    const auditEntry = await latestAuditEntryFor(
      PLATFORM_AUDIT_ACTION.OUTFIT_SLOT_TYPE_CREATED,
      created.id,
    );
    expect(auditEntry).toMatchObject({ actorUserId: userId });
    expect(auditEntry?.metadata).toMatchObject({
      before: null,
      after: {
        key: created.key,
        productTypeSlugs: ["accessories"],
        blocksSlotKeys: [topSlotKey],
      },
    });
  });

  it("refuses a duplicate key with 409", async () => {
    const { authHeader } = await createAdminSession();
    const existing = await createSlotType(authHeader);

    const response = await request(testApp)
      .post(SLOT_TYPES_PATH)
      .set("Authorization", authHeader)
      .send(await slotTypeBody({ key: existing.key }));

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SLOT_KEY_TAKEN");
  });

  it("refuses a slot with no garment types unless it takes any garment type", async () => {
    const { authHeader } = await createAdminSession();

    const refused = await request(testApp)
      .post(SLOT_TYPES_PATH)
      .set("Authorization", authHeader)
      .send(await slotTypeBody({ productTypeIds: [] }));
    expect(refused.status).toBe(VALIDATION_FAILED_STATUS);

    const anyGarmentSlot = await createSlotType(authHeader, {
      productTypeIds: [],
      acceptsAnyProductType: true,
    });
    expect(anyGarmentSlot.acceptsAnyProductType).toBe(true);
  });

  it("refuses unknown garment types and unknown slot types to block", async () => {
    const { authHeader } = await createAdminSession();

    const unknownProductType = await request(testApp)
      .post(SLOT_TYPES_PATH)
      .set("Authorization", authHeader)
      .send(await slotTypeBody({ productTypeIds: [randomUUID()] }));
    expect(unknownProductType.status).toBe(422);
    expect(unknownProductType.body.code).toBe("UNKNOWN_PRODUCT_TYPES");

    const unknownBlockedSlot = await request(testApp)
      .post(SLOT_TYPES_PATH)
      .set("Authorization", authHeader)
      .send(await slotTypeBody({ blocksSlotTypeIds: [randomUUID()] }));
    expect(unknownBlockedSlot.status).toBe(422);
    expect(unknownBlockedSlot.body.code).toBe("UNKNOWN_SLOT_TYPES");
  });

  it("refuses an icon outside the fixed set, too many items, and unknown fields", async () => {
    const { authHeader } = await createAdminSession();

    for (const invalidOverride of [{ icon: "rocket" }, { maxItems: 11 }, { price: 100 }]) {
      const response = await request(testApp)
        .post(SLOT_TYPES_PATH)
        .set("Authorization", authHeader)
        .send(await slotTypeBody(invalidOverride));
      expect(response.status).toBe(VALIDATION_FAILED_STATUS);
    }
  });

  it("refuses a catalog reader", async () => {
    const { authHeader } = await createRoleLimitedStaffSession("platform:catalog:read");

    const response = await request(testApp)
      .post(SLOT_TYPES_PATH)
      .set("Authorization", authHeader)
      .send(await slotTypeBody());

    expect(response.status).toBe(403);
  });
});

describe("PATCH /api/outfit-slot-types/:id", () => {
  it("updates fields and links, and audits the before and after", async () => {
    const { authHeader } = await createAdminSession();
    const created = await createSlotType(authHeader);
    const footwearTypeId = await ensureProductType("footwear", "Footwear");

    const response = await request(testApp)
      .patch(`${SLOT_TYPES_PATH}/${created.id}`)
      .set("Authorization", authHeader)
      .send({ label: "Shoes and bags", maxItems: 2, productTypeIds: [footwearTypeId] });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      label: "Shoes and bags",
      maxItems: 2,
      productTypes: [expect.objectContaining({ slug: "footwear" })],
    });

    const auditEntry = await latestAuditEntryFor(
      PLATFORM_AUDIT_ACTION.OUTFIT_SLOT_TYPE_UPDATED,
      created.id,
    );
    expect(auditEntry?.metadata).toMatchObject({
      before: { label: "Scarf", maxItems: 1, productTypeSlugs: ["accessories"] },
      after: { label: "Shoes and bags", maxItems: 2, productTypeSlugs: ["footwear"] },
    });
  });

  it("switches a slot type off without deleting it", async () => {
    const { authHeader } = await createAdminSession();
    const created = await createSlotType(authHeader);

    const response = await request(testApp)
      .patch(`${SLOT_TYPES_PATH}/${created.id}`)
      .set("Authorization", authHeader)
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.data.isActive).toBe(false);
  });

  it("refuses a slot type blocking itself", async () => {
    const { authHeader } = await createAdminSession();
    const created = await createSlotType(authHeader);

    const response = await request(testApp)
      .patch(`${SLOT_TYPES_PATH}/${created.id}`)
      .set("Authorization", authHeader)
      .send({ blocksSlotTypeIds: [created.id] });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("SLOT_TYPE_BLOCKS_ITSELF");
  });

  it("refuses removing every garment type from a slot that doesn't take any garment", async () => {
    const { authHeader } = await createAdminSession();
    const created = await createSlotType(authHeader);

    const response = await request(testApp)
      .patch(`${SLOT_TYPES_PATH}/${created.id}`)
      .set("Authorization", authHeader)
      .send({ productTypeIds: [] });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("SLOT_TYPE_NEEDS_PRODUCT_TYPES");
  });

  it("does not accept a key change, an empty body, or an unknown slot type", async () => {
    const { authHeader } = await createAdminSession();
    const created = await createSlotType(authHeader);

    const keyChange = await request(testApp)
      .patch(`${SLOT_TYPES_PATH}/${created.id}`)
      .set("Authorization", authHeader)
      .send({ key: "renamed" });
    expect(keyChange.status).toBe(VALIDATION_FAILED_STATUS);

    const emptyBody = await request(testApp)
      .patch(`${SLOT_TYPES_PATH}/${created.id}`)
      .set("Authorization", authHeader)
      .send({});
    expect(emptyBody.status).toBe(VALIDATION_FAILED_STATUS);

    const unknownSlotType = await request(testApp)
      .patch(`${SLOT_TYPES_PATH}/${randomUUID()}`)
      .set("Authorization", authHeader)
      .send({ label: "Nothing" });
    expect(unknownSlotType.status).toBe(404);
  });
});

describe("POST /api/outfit-slot-types/reorder", () => {
  const createThreeSlotTypes = async (authHeader: string): Promise<string[]> => {
    for (const label of ["Top", "Bottom", "Extra"]) {
      await createSlotType(authHeader, { key: uniqueSlotKey("slot"), label });
    }
    const everySlotType = await prisma.outfitSlotType.findMany({
      select: { id: true },
      orderBy: { sortOrder: "asc" },
    });
    return everySlotType.map((slotType) => slotType.id);
  };

  it("reorders every slot type and audits it", async () => {
    const { authHeader } = await createAdminSession();
    const createdIds = await createThreeSlotTypes(authHeader);
    const reversedIds = [...createdIds].reverse();

    const response = await request(testApp)
      .post(`${SLOT_TYPES_PATH}/reorder`)
      .set("Authorization", authHeader)
      .send({ orderedIds: reversedIds });

    expect(response.status).toBe(200);
    const reordered = await prisma.outfitSlotType.findMany({ orderBy: { sortOrder: "asc" } });
    expect(reordered.map((slotType) => slotType.id)).toEqual(reversedIds);

    const auditEntry = await prisma.platformAuditLog.findFirst({
      where: { action: PLATFORM_AUDIT_ACTION.OUTFIT_SLOT_TYPES_REORDERED },
      orderBy: { createdAt: "desc" },
    });
    expect(auditEntry?.metadata).toMatchObject({ orderedIds: reversedIds });
  });

  it("refuses a list that leaves a slot type out or repeats one", async () => {
    const { authHeader } = await createAdminSession();
    const [firstSlotType, ...otherSlotTypes] = await createThreeSlotTypes(authHeader);

    for (const orderedIds of [otherSlotTypes, [firstSlotType, firstSlotType, ...otherSlotTypes]]) {
      const response = await request(testApp)
        .post(`${SLOT_TYPES_PATH}/reorder`)
        .set("Authorization", authHeader)
        .send({ orderedIds });
      expect(response.status).toBe(422);
      expect(response.body.code).toBe("INVALID_ORDER");
    }
  });
});
