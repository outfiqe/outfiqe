import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { testApp } from "#test/integration/testApp.js";

const createBrand = (name: string) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Test Contact",
      email: `${randomUUID()}@outfiqe.test`,
      phone: `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`,
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

describe("GET /api/brands", () => {
  it("returns brands matching a case-insensitive name search", async () => {
    const nike = await createBrand(`Nike Sportswear ${randomUUID()}`);
    await createBrand(`Adidas Originals ${randomUUID()}`);

    const response = await request(testApp).get("/api/brands").query({ q: "nike sportswear" });

    expect(response.status).toBe(200);
    const ids = response.body.data.brands.map((brand: { id: string }) => brand.id);
    expect(ids).toContain(nike.id);
    expect(ids).toHaveLength(1);
  });

  it("returns an empty list for a search with no matches", async () => {
    const response = await request(testApp)
      .get("/api/brands")
      .query({ q: `zzznonexistentbrandzzz-${randomUUID()}` });

    expect(response.status).toBe(200);
    expect(response.body.data.brands).toEqual([]);
  });

  it("ignores the search filter when q is omitted", async () => {
    await createBrand(`Unfiltered Brand ${randomUUID()}`);

    const response = await request(testApp).get("/api/brands").query({ limit: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data.brands.length).toBeGreaterThan(0);
  });
});
