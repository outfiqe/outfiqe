import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";

import { addressRepository } from "./address.repository.js";
import { MAX_SAVED_ADDRESSES_PER_USER } from "./address.service.js";

const OK_STATUS = 200;
const CREATED_STATUS = 201;
const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const VALIDATION_ERROR_STATUS = 422;
const RATE_LIMITED_STATUS = 429;

beforeEach(async () => {
  await redis.flushdb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

const createUser = async (role: UserRole = UserRole.CUSTOMER) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `address-tester-${suffix}@outfiqe.test`,
      name: "Sabin Shrestha",
      handle: `address-tester-${suffix}`,
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

const authHeaderForRole = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const validBody = (overrides: Record<string, unknown> = {}) => ({
  label: "Home",
  fullName: "Sabin Shrestha",
  phone: "9812345678",
  address: "Baluwatar, Ward 4",
  city: "Kathmandu",
  landmark: "Near the chowk",
  ...overrides,
});

const postAddress = (userId: string, overrides: Record<string, unknown> = {}) =>
  request(testApp)
    .post("/api/addresses")
    .set("Authorization", authHeaderFor(userId))
    .send(validBody(overrides));

describe("GET /api/addresses", () => {
  it("401s without a token", async () => {
    const response = await request(testApp).get("/api/addresses");
    expect(response.status).toBe(UNAUTHORIZED_STATUS);
  });

  it("403s a brand-owner account — saved addresses are for shoppers only", async () => {
    const brandOwner = await createUser(UserRole.BRAND_OWNER);

    const listResponse = await request(testApp)
      .get("/api/addresses")
      .set("Authorization", authHeaderForRole(brandOwner.id, UserRole.BRAND_OWNER));
    expect(listResponse.status).toBe(FORBIDDEN_STATUS);

    const createResponse = await request(testApp)
      .post("/api/addresses")
      .set("Authorization", authHeaderForRole(brandOwner.id, UserRole.BRAND_OWNER))
      .send(validBody());
    expect(createResponse.status).toBe(FORBIDDEN_STATUS);
  });

  it("lists only the caller's addresses, default first", async () => {
    const owner = await createUser();
    const other = await createUser();

    await postAddress(owner.id, { label: "Home" });
    await postAddress(owner.id, { label: "Office" });
    await postAddress(other.id, { label: "Someone else" });

    const response = await request(testApp)
      .get("/api/addresses")
      .set("Authorization", authHeaderFor(owner.id));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].isDefault).toBe(true);
    expect(response.body.data.map((address: { label: string }) => address.label).sort()).toEqual([
      "Home",
      "Office",
    ]);
  });

  it("breaks an updatedAt tie deterministically by id, newest id first", async () => {
    const owner = await createUser();

    await postAddress(owner.id, { label: "Original default" });
    const candidateA = await postAddress(owner.id, { label: "Candidate A" });
    const candidateB = await postAddress(owner.id, { label: "Candidate B" });

    const tiedTimestamp = new Date("2026-01-01T00:00:00.000Z");
    await prisma.$executeRaw`UPDATE saved_addresses SET updated_at = ${tiedTimestamp} WHERE id = ${candidateA.body.data.id}`;
    await prisma.$executeRaw`UPDATE saved_addresses SET updated_at = ${tiedTimestamp} WHERE id = ${candidateB.body.data.id}`;

    const response = await request(testApp)
      .get("/api/addresses")
      .set("Authorization", authHeaderFor(owner.id));

    const nonDefaultIds = response.body.data
      .filter((address: { isDefault: boolean }) => !address.isDefault)
      .map((address: { id: string }) => address.id);
    const expectedOrder = [candidateA.body.data.id, candidateB.body.data.id].sort().reverse();

    expect(nonDefaultIds).toEqual(expectedOrder);
  });
});

describe("POST /api/addresses", () => {
  it("persists the address and makes the first one default", async () => {
    const owner = await createUser();

    const response = await postAddress(owner.id);

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.isDefault).toBe(true);
    expect(response.body.data.city).toBe("Kathmandu");

    const stored = await prisma.savedAddress.findMany({ where: { userId: owner.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.isDefault).toBe(true);
  });

  it("moves the default when a later address is created with isDefault", async () => {
    const owner = await createUser();

    const first = await postAddress(owner.id);
    const second = await postAddress(owner.id, { isDefault: true });

    const stored = await prisma.savedAddress.findMany({ where: { userId: owner.id } });
    const byId = new Map(stored.map((address) => [address.id, address.isDefault]));
    expect(byId.get(first.body.data.id)).toBe(false);
    expect(byId.get(second.body.data.id)).toBe(true);
    expect(stored.filter((address) => address.isDefault)).toHaveLength(1);
  });

  it("rejects an invalid phone", async () => {
    const owner = await createUser();
    const response = await postAddress(owner.id, { phone: "" });
    expect(response.status).toBe(VALIDATION_ERROR_STATUS);
  });

  it("enforces the per-user cap", async () => {
    const owner = await createUser();
    const authHeader = authHeaderFor(owner.id);

    for (let index = 0; index < MAX_SAVED_ADDRESSES_PER_USER; index += 1) {
      const created = await request(testApp)
        .post("/api/addresses")
        .set("Authorization", authHeader)
        .send(validBody({ label: `Address ${index}` }));
      expect(created.status).toBe(CREATED_STATUS);
    }

    const overflow = await request(testApp)
      .post("/api/addresses")
      .set("Authorization", authHeader)
      .send(validBody({ label: "One too many" }));

    expect(overflow.status).toBe(CONFLICT_STATUS);
    expect(overflow.body.code).toBe("ADDRESS_LIMIT_REACHED");
  });

  it("rate limits repeated writes", async () => {
    const owner = await createUser();
    const authHeader = authHeaderFor(owner.id);

    let sawRateLimit = false;
    for (let index = 0; index < 40; index += 1) {
      const response = await request(testApp)
        .patch(`/api/addresses/${randomUUID()}`)
        .set("Authorization", authHeader)
        .send({ label: `attempt ${index}` });
      if (response.status === RATE_LIMITED_STATUS) {
        sawRateLimit = true;
        break;
      }
    }
    expect(sawRateLimit).toBe(true);
  });
});

describe("PATCH /api/addresses/:id", () => {
  it("updates the caller's own address", async () => {
    const owner = await createUser();
    const created = await postAddress(owner.id);

    const response = await request(testApp)
      .patch(`/api/addresses/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ landmark: "Opposite the temple", label: "" });

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.landmark).toBe("Opposite the temple");
    expect(response.body.data.label).toBeNull();
  });

  it("updates every field and can promote the address to default", async () => {
    const owner = await createUser();
    const first = await postAddress(owner.id);
    const second = await postAddress(owner.id);

    const response = await request(testApp)
      .patch(`/api/addresses/${second.body.data.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({
        label: "Office",
        fullName: "Hari Prasad",
        phone: "9800000001",
        address: "Sanepa, Ward 2",
        city: "Lalitpur",
        landmark: "Behind the school",
        isDefault: true,
      });

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toMatchObject({
      label: "Office",
      fullName: "Hari Prasad",
      city: "Lalitpur",
      isDefault: true,
    });

    const stored = await prisma.savedAddress.findMany({ where: { userId: owner.id } });
    const byId = new Map(stored.map((address) => [address.id, address.isDefault]));
    expect(byId.get(first.body.data.id)).toBe(false);
    expect(byId.get(second.body.data.id)).toBe(true);
  });

  it("rejects an update with no fields", async () => {
    const owner = await createUser();
    const created = await postAddress(owner.id);

    const response = await request(testApp)
      .patch(`/api/addresses/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({});

    expect(response.status).toBe(VALIDATION_ERROR_STATUS);
  });

  it("404s updating another user's address", async () => {
    const owner = await createUser();
    const other = await createUser();
    const created = await postAddress(owner.id);

    const response = await request(testApp)
      .patch(`/api/addresses/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(other.id))
      .send({ city: "Pokhara" });

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });
});

describe("PATCH /api/addresses/:id/default", () => {
  it("keeps exactly one default", async () => {
    const owner = await createUser();
    const first = await postAddress(owner.id);
    const second = await postAddress(owner.id);

    await request(testApp)
      .patch(`/api/addresses/${second.body.data.id}/default`)
      .set("Authorization", authHeaderFor(owner.id));

    const stored = await prisma.savedAddress.findMany({ where: { userId: owner.id } });
    const byId = new Map(stored.map((address) => [address.id, address.isDefault]));
    expect(byId.get(first.body.data.id)).toBe(false);
    expect(byId.get(second.body.data.id)).toBe(true);
  });

  it("404s for an address the caller doesn't own", async () => {
    const owner = await createUser();
    const other = await createUser();
    const created = await postAddress(owner.id);

    const response = await request(testApp)
      .patch(`/api/addresses/${created.body.data.id}/default`)
      .set("Authorization", authHeaderFor(other.id));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });

  it("never leaves two addresses marked default when two set-default requests race", async () => {
    const owner = await createUser();
    const authHeader = authHeaderFor(owner.id);

    await postAddress(owner.id, { label: "Original default" });
    const candidateA = await postAddress(owner.id, { label: "Candidate A" });
    const candidateB = await postAddress(owner.id, { label: "Candidate B" });

    const setDefaultImmediately = (id: string) =>
      new Promise<request.Response>((resolve, reject) => {
        request(testApp)
          .patch(`/api/addresses/${id}/default`)
          .set("Authorization", authHeader)
          .end((error, response) => (error ? reject(error) : resolve(response)));
      });

    let releaseFirstClear: () => void = () => {};
    const firstClearGate = new Promise<void>((resolve) => {
      releaseFirstClear = resolve;
    });
    const originalClearDefault = addressRepository.clearDefault.bind(addressRepository);
    let hasHeldFirstCall = false;
    vi.spyOn(addressRepository, "clearDefault").mockImplementation(async (userId, client) => {
      await originalClearDefault(userId, client);
      if (!hasHeldFirstCall) {
        hasHeldFirstCall = true;
        await firstClearGate;
      }
    });

    const firstRequest = setDefaultImmediately(candidateA.body.data.id);
    await sleep(200);

    const secondRequest = setDefaultImmediately(candidateB.body.data.id);
    await sleep(200);

    releaseFirstClear();

    const [firstResponse, secondResponse] = await Promise.all([firstRequest, secondRequest]);

    expect(firstResponse.status).toBe(OK_STATUS);
    expect(secondResponse.status).toBe(OK_STATUS);

    const stored = await prisma.savedAddress.findMany({ where: { userId: owner.id } });
    expect(stored.filter((address) => address.isDefault)).toHaveLength(1);
  });
});

describe("DELETE /api/addresses/:id", () => {
  it("promotes the most recent remaining address when the default is deleted", async () => {
    const owner = await createUser();
    const authHeader = authHeaderFor(owner.id);

    const first = await postAddress(owner.id);
    const second = await postAddress(owner.id);

    await request(testApp)
      .delete(`/api/addresses/${first.body.data.id}`)
      .set("Authorization", authHeader);

    const stored = await prisma.savedAddress.findMany({ where: { userId: owner.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(second.body.data.id);
    expect(stored[0]?.isDefault).toBe(true);
  });

  it("breaks an updatedAt tie deterministically by id when promoting a new default", async () => {
    const owner = await createUser();
    const authHeader = authHeaderFor(owner.id);

    const original = await postAddress(owner.id, { label: "Original default" });
    const candidateA = await postAddress(owner.id, { label: "Candidate A" });
    const candidateB = await postAddress(owner.id, { label: "Candidate B" });

    const tiedTimestamp = new Date("2026-01-01T00:00:00.000Z");
    await prisma.$executeRaw`UPDATE saved_addresses SET updated_at = ${tiedTimestamp} WHERE id = ${candidateA.body.data.id}`;
    await prisma.$executeRaw`UPDATE saved_addresses SET updated_at = ${tiedTimestamp} WHERE id = ${candidateB.body.data.id}`;

    await request(testApp)
      .delete(`/api/addresses/${original.body.data.id}`)
      .set("Authorization", authHeader);

    const stored = await prisma.savedAddress.findMany({ where: { userId: owner.id } });
    const promoted = stored.find((address) => address.isDefault);
    const [expectedPromotedId] = [candidateA.body.data.id, candidateB.body.data.id]
      .sort()
      .reverse();

    expect(promoted?.id).toBe(expectedPromotedId);
  });

  it("leaves the book empty without error when the last address is deleted", async () => {
    const owner = await createUser();
    const authHeader = authHeaderFor(owner.id);
    const created = await postAddress(owner.id);

    const response = await request(testApp)
      .delete(`/api/addresses/${created.body.data.id}`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    const stored = await prisma.savedAddress.findMany({ where: { userId: owner.id } });
    expect(stored).toHaveLength(0);
  });

  it("404s deleting another user's address", async () => {
    const owner = await createUser();
    const other = await createUser();
    const created = await postAddress(owner.id);

    const response = await request(testApp)
      .delete(`/api/addresses/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(other.id));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });
});
