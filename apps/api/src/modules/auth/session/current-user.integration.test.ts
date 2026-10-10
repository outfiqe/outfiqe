import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BrandRole, UserRole } from "#generated/prisma/enums.js";
import { generateToken } from "#lib/generate-token.utils.js";
import { createUser } from "#test/integration/auth-fixtures.js";
import { seedTenantOrganization } from "#test/integration/crm-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

describe("GET /api/auth/me", () => {
  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  it("returns the authenticated user's profile", async () => {
    const { user, password } = await createUser({ emailVerified: true });
    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    const accessToken: string = login.body.data.accessToken;

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: UserRole.CUSTOMER,
      hasPassword: true,
    });
  });

  it("reports hasPassword false for an oauth-only account with no password", async () => {
    const suffix = randomUUID().slice(0, 8);
    const oauthOnlyUser = await prisma.user.create({
      data: {
        email: `oauth-only-${suffix}@outfiqe.test`,
        name: "OAuth Only",
        handle: `oauth-only-${suffix}`,
        phone: null,
        passwordHash: null,
        emailVerified: true,
      },
    });
    const accessToken = generateToken({ sub: oauthOnlyUser.id, role: oauthOnlyUser.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ phone: null, hasPassword: false });
  });

  it("reports hasPlatformAccess false for a customer account", async () => {
    const { user, password } = await createUser({ emailVerified: true });
    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    const accessToken: string = login.body.data.accessToken;

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasPlatformAccess: false });
  });

  it("reports hasPlatformAccess false for an admin account with no CRM membership", async () => {
    const suffix = randomUUID().slice(0, 8);
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-no-crm-${suffix}@outfiqe.test`,
        name: "Admin No CRM",
        handle: `admin-no-crm-${suffix}`,
        phone: null,
        passwordHash: null,
        role: UserRole.ADMIN,
        emailVerified: true,
      },
    });
    const accessToken = generateToken({ sub: adminUser.id, role: adminUser.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasPlatformAccess: false });
  });

  it("includes hasPlatformAccess for a brand owner account, so apps/admin can sign them in", async () => {
    const suffix = randomUUID().slice(0, 8);
    const brandOwner = await prisma.user.create({
      data: {
        email: `brand-owner-${suffix}@outfiqe.test`,
        name: "Brand Owner",
        handle: `brand-owner-${suffix}`,
        phone: uniquePhone(),
        passwordHash: null,
        role: UserRole.BRAND_OWNER,
        emailVerified: true,
      },
    });
    const brand = await prisma.brand.create({
      data: {
        name: "Test Brand",
        contactName: "Brand Contact",
        email: `brand-${suffix}@outfiqe.test`,
        phone: uniquePhone(),
        instagram: `@${suffix}`,
      },
    });
    await prisma.brandMembership.create({
      data: { userId: brandOwner.id, brandId: brand.id, role: BrandRole.OWNER },
    });
    const accessToken = generateToken({ sub: brandOwner.id, role: brandOwner.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      role: UserRole.BRAND_OWNER,
      brandId: brand.id,
      hasPlatformAccess: false,
    });
  });

  it("reports hasCrmAccess false for a customer with no CRM membership", async () => {
    const { user, password } = await createUser({ emailVerified: true });
    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.data.accessToken as string}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasCrmAccess: false });
  });

  it("reports hasCrmAccess true for an account with an active CRM membership", async () => {
    const suffix = randomUUID().slice(0, 8);
    const crmUser = await prisma.user.create({
      data: {
        email: `crm-member-${suffix}@outfiqe.test`,
        name: "CRM Member",
        handle: `crm-member-${suffix}`,
        phone: uniquePhone(),
        passwordHash: null,
        role: UserRole.BRAND_OWNER,
        emailVerified: true,
      },
    });
    const { organization, adminRole } = await seedTenantOrganization();
    await prisma.membership.create({
      data: {
        userId: crmUser.id,
        organizationId: organization.id,
        roleId: adminRole.id,
        status: "ACTIVE",
      },
    });
    const accessToken = generateToken({ sub: crmUser.id, role: crmUser.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasCrmAccess: true });
  });

  it("reports hasCrmAccess false when the only CRM membership is deactivated", async () => {
    const suffix = randomUUID().slice(0, 8);
    const crmUser = await prisma.user.create({
      data: {
        email: `crm-deactivated-${suffix}@outfiqe.test`,
        name: "Deactivated CRM Member",
        handle: `crm-deactivated-${suffix}`,
        phone: uniquePhone(),
        passwordHash: null,
        role: UserRole.BRAND_OWNER,
        emailVerified: true,
      },
    });
    const { organization, memberRole } = await seedTenantOrganization();
    await prisma.membership.create({
      data: {
        userId: crmUser.id,
        organizationId: organization.id,
        roleId: memberRole.id,
        status: "DEACTIVATED",
      },
    });
    const accessToken = generateToken({ sub: crmUser.id, role: crmUser.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasCrmAccess: false });
  });

  it("includes a brand owner's real phone number, instead of always reporting none", async () => {
    const suffix = randomUUID().slice(0, 8);
    const phone = uniquePhone();
    const brandOwner = await prisma.user.create({
      data: {
        email: `brand-owner-${suffix}@outfiqe.test`,
        name: "Brand Owner",
        handle: `brand-owner-${suffix}`,
        phone,
        passwordHash: null,
        role: UserRole.BRAND_OWNER,
        emailVerified: true,
      },
    });
    const brand = await prisma.brand.create({
      data: {
        name: "Test Brand",
        contactName: "Brand Contact",
        email: `brand-${suffix}@outfiqe.test`,
        phone: uniquePhone(),
        instagram: `@${suffix}`,
      },
    });
    await prisma.brandMembership.create({
      data: { userId: brandOwner.id, brandId: brand.id, role: BrandRole.OWNER },
    });
    const accessToken = generateToken({ sub: brandOwner.id, role: brandOwner.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ phone });
  });
});
