import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BrandApplicationStatus, MakesOwnPieces } from "#generated/prisma/enums.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const validApplicationBody = (overrides: Partial<Record<string, string>> = {}) => ({
  brandName: "Test Atelier",
  contactName: "Jordan Lee",
  email: `brand-${randomUUID()}@outfiqe.test`,
  phone: uniquePhone(),
  instagram: "@test.atelier",
  makesOwnPieces: MakesOwnPieces.MAKES,
  ...overrides,
});

describe("POST /api/brand-applications", () => {
  it("creates a pending application", async () => {
    const body = validApplicationBody();

    const response = await request(testApp).post("/api/brand-applications").send(body);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ success: true });

    const stored = await prisma.brandApplication.findFirst({ where: { email: body.email } });
    expect(stored).toMatchObject({
      brandName: body.brandName,
      status: BrandApplicationStatus.PENDING,
    });
  });

  it("rejects an invalid phone number", async () => {
    const response = await request(testApp)
      .post("/api/brand-applications")
      .send(validApplicationBody({ phone: "12345" }));

    expect(response.status).toBe(422);
  });
});

describe("GET /api/brand-applications", () => {
  it("requires admin authentication", async () => {
    const response = await request(testApp).get("/api/brand-applications");

    expect(response.status).toBe(401);
  });

  it("lists applications with cursor pagination", async () => {
    const { authHeader } = await createAdminSession();
    for (let i = 0; i < 3; i += 1) {
      await prisma.brandApplication.create({ data: validApplicationBody() });
    }

    const firstPage = await request(testApp)
      .get("/api/brand-applications")
      .query({ limit: 2 })
      .set("Authorization", authHeader);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.applications).toHaveLength(2);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(testApp)
      .get("/api/brand-applications")
      .query({ limit: 2, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeader);

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.applications).toHaveLength(1);
    expect(secondPage.body.data.nextCursor).toBeNull();
  });
});

describe("POST /api/brand-applications/:id/approve", () => {
  it("approves a pending application and provisions a brand invite", async () => {
    const { authHeader } = await createAdminSession();
    const application = await prisma.brandApplication.create({ data: validApplicationBody() });

    const response = await request(testApp)
      .post(`/api/brand-applications/${application.id}/approve`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);

    const updated = await prisma.brandApplication.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(updated.status).toBe(BrandApplicationStatus.APPROVED);
    expect(updated.reviewedAt).not.toBeNull();

    const brand = await prisma.brand.findUnique({ where: { applicationId: application.id } });
    expect(brand).not.toBeNull();

    const invite = await prisma.brandInvite.findFirst({ where: { brandId: brand?.id } });
    expect(invite).not.toBeNull();
  });

  it("blocks approval when the application email already belongs to an account", async () => {
    const { authHeader } = await createAdminSession();
    const registeredEmail = `registered-${randomUUID()}@outfiqe.test`;
    await prisma.user.create({
      data: {
        email: registeredEmail,
        name: "Existing Shopper",
        handle: `existing-shopper-${randomUUID().slice(0, 8)}`,
      },
    });
    const application = await prisma.brandApplication.create({
      data: validApplicationBody({ email: registeredEmail }),
    });

    const response = await request(testApp)
      .post(`/api/brand-applications/${application.id}/approve`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("EMAIL_ALREADY_REGISTERED");

    const updated = await prisma.brandApplication.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(updated.status).toBe(BrandApplicationStatus.PENDING);

    const brand = await prisma.brand.findUnique({ where: { applicationId: application.id } });
    expect(brand).toBeNull();
  });

  it("rejects re-reviewing an already-approved application", async () => {
    const { authHeader } = await createAdminSession();
    const application = await prisma.brandApplication.create({ data: validApplicationBody() });
    await request(testApp)
      .post(`/api/brand-applications/${application.id}/approve`)
      .set("Authorization", authHeader);

    const response = await request(testApp)
      .post(`/api/brand-applications/${application.id}/approve`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ALREADY_REVIEWED");
  });

  it("returns 404 for an unknown application id", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .post(`/api/brand-applications/${randomUUID()}/approve`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/brand-applications/:id/reject", () => {
  it("rejects a pending application", async () => {
    const { authHeader } = await createAdminSession();
    const application = await prisma.brandApplication.create({ data: validApplicationBody() });

    const response = await request(testApp)
      .post(`/api/brand-applications/${application.id}/reject`)
      .set("Authorization", authHeader)
      .send({ reason: "Not a fit right now." });

    expect(response.status).toBe(200);

    const updated = await prisma.brandApplication.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(updated.status).toBe(BrandApplicationStatus.REJECTED);
  });
});
