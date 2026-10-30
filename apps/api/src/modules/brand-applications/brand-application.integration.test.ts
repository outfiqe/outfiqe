import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BrandApplicationStatus, MakesOwnPieces } from "#generated/prisma/enums.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

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

describe("POST /api/brand-applications/:id/resend-invite", () => {
  const approveNewApplication = async (authHeader: string) => {
    const application = await prisma.brandApplication.create({ data: validApplicationBody() });
    await request(testApp)
      .post(`/api/brand-applications/${application.id}/approve`)
      .set("Authorization", authHeader);
    return application;
  };

  it("replaces the invite so only the newest link works", async () => {
    const { authHeader } = await createAdminSession();
    const { id: applicationId } = await approveNewApplication(authHeader);
    const { tokenHash: originalTokenHash } = await prisma.brandInvite.findFirstOrThrow({
      where: { brand: { applicationId } },
    });

    const response = await request(testApp)
      .post(`/api/brand-applications/${applicationId}/resend-invite`)
      .set("Authorization", authHeader);

    const invites = await prisma.brandInvite.findMany({ where: { brand: { applicationId } } });
    expect(response.status).toBe(200);
    expect(response.body.data.isInviteDelivered).toBe(true);
    expect(invites).toHaveLength(1);
    expect(invites[0]?.tokenHash).not.toBe(originalTokenHash);
  });

  it("refuses once the brand has accepted its invite", async () => {
    const { authHeader } = await createAdminSession();
    const { id: applicationId } = await approveNewApplication(authHeader);
    await prisma.brandInvite.updateMany({
      where: { brand: { applicationId } },
      data: { acceptedAt: new Date() },
    });

    const response = await request(testApp)
      .post(`/api/brand-applications/${applicationId}/resend-invite`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("NO_INVITE_TO_RESEND");
  });

  it("refuses an application that was never approved", async () => {
    const { authHeader } = await createAdminSession();
    const application = await prisma.brandApplication.create({ data: validApplicationBody() });

    const response = await request(testApp)
      .post(`/api/brand-applications/${application.id}/resend-invite`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(409);
  });

  it("lists an approved brand as still waiting to set up", async () => {
    const { authHeader } = await createAdminSession();
    const { id: applicationId } = await approveNewApplication(authHeader);

    const response = await request(testApp)
      .get("/api/brand-applications?status=APPROVED&limit=50")
      .set("Authorization", authHeader);

    const listedApplication = response.body.data.applications.find(
      ({ id }: { id: string }) => id === applicationId,
    );
    expect(listedApplication.isAwaitingBrandSetup).toBe(true);
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

  it("never lets two concurrent approvals both provision a brand", async () => {
    const { authHeader } = await createAdminSession();
    const application = await prisma.brandApplication.create({ data: validApplicationBody() });

    const [resultA, resultB] = await Promise.all([
      request(testApp)
        .post(`/api/brand-applications/${application.id}/approve`)
        .set("Authorization", authHeader),
      request(testApp)
        .post(`/api/brand-applications/${application.id}/approve`)
        .set("Authorization", authHeader),
    ]);

    const statuses = [resultA.status, resultB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const brands = await prisma.brand.findMany({ where: { applicationId: application.id } });
    expect(brands).toHaveLength(1);
  });

  it("never lets a concurrent approve and reject both succeed", async () => {
    const { authHeader } = await createAdminSession();
    const application = await prisma.brandApplication.create({ data: validApplicationBody() });

    const [approveResult, rejectResult] = await Promise.all([
      request(testApp)
        .post(`/api/brand-applications/${application.id}/approve`)
        .set("Authorization", authHeader),
      request(testApp)
        .post(`/api/brand-applications/${application.id}/reject`)
        .set("Authorization", authHeader)
        .send({ reason: "Racing the approval." }),
    ]);

    const statuses = [approveResult.status, rejectResult.status].sort();
    expect(statuses).toEqual([200, 409]);

    const updated = await prisma.brandApplication.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect([BrandApplicationStatus.APPROVED, BrandApplicationStatus.REJECTED]).toContain(
      updated.status,
    );
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
