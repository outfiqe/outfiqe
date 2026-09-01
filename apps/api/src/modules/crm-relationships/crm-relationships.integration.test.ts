import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmRelationshipsService } from "#modules/crm-relationships/crm-relationships.service.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createUser = (name: string, role: UserRole) =>
  prisma.user.create({
    data: {
      email: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const createBrandWithProduct = async (brandName: string) => {
  const brand = await prisma.brand.create({
    data: {
      name: brandName,
      contactName: "Contact",
      email: `${randomUUID()}@brand.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: `${brandName} Tee`,
      price: 1500,
      type: "TOPS",
      status: "APPROVED",
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 10 },
  });
  return { brand, product, size };
};

const linkTenantToBrand = async (brandId: string) => {
  const { organization, adminRole } = await seedTenantOrganization({ linkedBrandId: brandId });
  const staff = await createUser("Tenant Staff", UserRole.ADMIN);
  const membership = await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: staff.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      superAdminMembershipId: membership.id,
      trialEndsAt: addDays(new Date(), 10),
    },
  });
  return { organization, staff, host: `${organization.subdomain}.localhost` };
};

const attachCreatorSignals = async (
  creatorId: string,
  productId: string,
  options: { withAttributedOrder?: boolean } = {},
) => {
  await prisma.creatorLink.create({
    data: { creatorId, productId, token: randomUUID(), type: "EXTERNAL_REUSABLE" },
  });
  const look = await prisma.creatorLook.create({
    data: { creatorId, imageUrl: "https://img.test/look.jpg" },
  });
  await prisma.creatorLookProduct.create({ data: { creatorLookId: look.id, productId } });
  await prisma.creatorLookTagClick.create({
    data: { creatorLookId: look.id, productId, sessionId: randomUUID() },
  });

  if (options.withAttributedOrder) {
    const buyer = await createUser("Attributed Buyer", UserRole.CUSTOMER);
    await prisma.order.create({
      data: {
        userId: buyer.id,
        fullName: "Attributed Buyer",
        phone: uniquePhone(),
        address: "1 Test Rd",
        city: "Kathmandu",
        paymentMethod: "COD",
        paymentStatus: "PAID",
        subtotal: 1500,
        deliveryFee: 100,
        total: 1600,
        items: {
          create: {
            productId,
            sizeId: (await prisma.productSize.findFirstOrThrow({ where: { productId } })).id,
            qty: 1,
            unitPrice: 1500,
            attributedCreatorId: creatorId,
          },
        },
      },
    });
  }
};

const placeCustomerOrder = async (
  userId: string,
  productId: string,
  paymentStatus: "PAID" | "DUE",
) => {
  const size = await prisma.productSize.findFirstOrThrow({ where: { productId } });
  return prisma.order.create({
    data: {
      userId,
      fullName: "Shopper",
      phone: uniquePhone(),
      address: "2 Test Rd",
      city: "Lalitpur",
      paymentMethod: "COD",
      paymentStatus,
      subtotal: 3000,
      deliveryFee: 100,
      total: 3100,
      items: { create: { productId, sizeId: size.id, qty: 2, unitPrice: 1500 } },
    },
  });
};

describe("GET /api/crm/partners", () => {
  it("lists only creators tied to the tenant's own linked brand", async () => {
    const { product: productA } = await createBrandWithProduct("Brand A");
    const { product: productB } = await createBrandWithProduct("Brand B");
    const tenantA = await linkTenantToBrand(
      (await prisma.product.findUniqueOrThrow({ where: { id: productA.id } })).brandId,
    );

    const creatorForA = await createUser("Creator A", UserRole.CUSTOMER);
    const creatorForB = await createUser("Creator B", UserRole.CUSTOMER);
    await attachCreatorSignals(creatorForA.id, productA.id, { withAttributedOrder: true });
    await attachCreatorSignals(creatorForB.id, productB.id);

    const response = await request(testApp)
      .get("/api/crm/partners")
      .set("Host", tenantA.host)
      .set("Authorization", authHeaderFor(tenantA.staff.id));

    expect(response.status).toBe(200);
    const creatorIds = response.body.data.items.map((p: { creatorId: string }) => p.creatorId);
    expect(creatorIds).toEqual([creatorForA.id]);
    expect(response.body.data.items[0].attributedOrderCount).toBe(1);
    expect(response.body.data.items[0].attributedRevenue).toBe(1500);
    expect(response.body.data.items[0].tagClickCount).toBe(1);
    expect(response.body.data.reason).toBeNull();
  });

  it("filters by a name/handle search term and paginates", async () => {
    const { product } = await createBrandWithProduct("Search Brand");
    const tenant = await linkTenantToBrand(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).brandId,
    );
    const matching = await createUser("Findable Creator", UserRole.CUSTOMER);
    const other = await createUser("Hidden Maker", UserRole.CUSTOMER);
    await attachCreatorSignals(matching.id, product.id);
    await attachCreatorSignals(other.id, product.id);

    const searched = await request(testApp)
      .get("/api/crm/partners")
      .query({ q: "findable" })
      .set("Host", tenant.host)
      .set("Authorization", authHeaderFor(tenant.staff.id));
    expect(searched.status).toBe(200);
    expect(searched.body.data.items.map((p: { creatorId: string }) => p.creatorId)).toEqual([
      matching.id,
    ]);

    const firstPage = await request(testApp)
      .get("/api/crm/partners")
      .query({ page: 1, pageSize: 1 })
      .set("Host", tenant.host)
      .set("Authorization", authHeaderFor(tenant.staff.id));
    expect(firstPage.body.data.items).toHaveLength(1);
    expect(firstPage.body.data.total).toBe(2);
    expect(firstPage.body.data.hasMore).toBe(true);
  });

  it("returns an explicit not-linked reason for an organization with no brand", async () => {
    const { organization, adminRole } = await seedTenantOrganization();
    const staff = await createUser("Unlinked Staff", UserRole.ADMIN);
    const membership = await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: staff.id,
        roleId: adminRole.id,
        status: "ACTIVE",
      },
    });
    await prisma.organization.update({
      where: { id: organization.id },
      data: { superAdminMembershipId: membership.id, trialEndsAt: addDays(new Date(), 10) },
    });

    const response = await request(testApp)
      .get("/api/crm/partners")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.reason).toBe("ORGANIZATION_NOT_LINKED_TO_BRAND");
  });

  it("blocks access once the trial has ended with no subscription", async () => {
    const { product } = await createBrandWithProduct("Lapsed Brand");
    const tenant = await linkTenantToBrand(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).brandId,
    );
    await prisma.organization.update({
      where: { id: tenant.organization.id },
      data: { trialEndsAt: addDays(new Date(), -1) },
    });

    const response = await request(testApp)
      .get("/api/crm/partners")
      .set("Host", tenant.host)
      .set("Authorization", authHeaderFor(tenant.staff.id));

    expect(response.status).toBe(402);
    expect(response.body.code).toBe("ADVANCED_FEATURES_LOCKED");
  });
});

describe("GET /api/crm/partners/:creatorId", () => {
  it("returns a per-product breakdown and 404s for a creator with no signal for this brand", async () => {
    const { product } = await createBrandWithProduct("Detail Brand");
    const tenant = await linkTenantToBrand(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).brandId,
    );
    const creator = await createUser("Detail Creator", UserRole.CUSTOMER);
    await attachCreatorSignals(creator.id, product.id, { withAttributedOrder: true });

    const found = await request(testApp)
      .get(`/api/crm/partners/${creator.id}`)
      .set("Host", tenant.host)
      .set("Authorization", authHeaderFor(tenant.staff.id));
    expect(found.status).toBe(200);
    expect(found.body.data.productBreakdown).toHaveLength(1);
    expect(found.body.data.recentAttributedOrders).toHaveLength(1);

    const stranger = await createUser("Unrelated Creator", UserRole.CUSTOMER);
    const missing = await request(testApp)
      .get(`/api/crm/partners/${stranger.id}`)
      .set("Host", tenant.host)
      .set("Authorization", authHeaderFor(tenant.staff.id));
    expect(missing.status).toBe(404);
  });
});

describe("GET /api/crm/customers", () => {
  it("lists shoppers who bought the tenant brand's products, scoped by brand", async () => {
    const { product: productA } = await createBrandWithProduct("Shop Brand A");
    const { product: productB } = await createBrandWithProduct("Shop Brand B");
    const tenantA = await linkTenantToBrand(
      (await prisma.product.findUniqueOrThrow({ where: { id: productA.id } })).brandId,
    );

    const buyerOfA = await createUser("Buyer Of A", UserRole.CUSTOMER);
    const buyerOfB = await createUser("Buyer Of B", UserRole.CUSTOMER);
    await placeCustomerOrder(buyerOfA.id, productA.id, "PAID");
    await placeCustomerOrder(buyerOfB.id, productB.id, "PAID");

    const response = await request(testApp)
      .get("/api/crm/customers")
      .set("Host", tenantA.host)
      .set("Authorization", authHeaderFor(tenantA.staff.id));

    expect(response.status).toBe(200);
    const userIds = response.body.data.items.map((c: { userId: string }) => c.userId);
    expect(userIds).toEqual([buyerOfA.id]);
    expect(response.body.data.items[0].orderCount).toBe(1);
    expect(response.body.data.items[0].totalPaid).toBe(3000);
  });

  it("404s a customer detail lookup for a shopper who never bought from this brand", async () => {
    const { product } = await createBrandWithProduct("Cust Detail Brand");
    const tenant = await linkTenantToBrand(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).brandId,
    );
    const stranger = await createUser("Never Bought", UserRole.CUSTOMER);

    const response = await request(testApp)
      .get(`/api/crm/customers/${stranger.id}`)
      .set("Host", tenant.host)
      .set("Authorization", authHeaderFor(tenant.staff.id));

    expect(response.status).toBe(404);
  });
});

describe("crmRelationshipsService.isPartner", () => {
  it("is true only for a creator with a signal on the tenant's linked brand", async () => {
    const { product } = await createBrandWithProduct("Is Partner Brand");
    const brandId = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).brandId;
    const tenant = await linkTenantToBrand(brandId);
    const creator = await createUser("Signal Creator", UserRole.CUSTOMER);
    const stranger = await createUser("No Signal Creator", UserRole.CUSTOMER);
    await attachCreatorSignals(creator.id, product.id);

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: tenant.organization.id },
    });

    expect(await crmRelationshipsService.isPartner(organization, creator.id)).toBe(true);
    expect(await crmRelationshipsService.isPartner(organization, stranger.id)).toBe(false);
    expect(
      await crmRelationshipsService.isPartner(
        { id: organization.id, linkedBrandId: null },
        creator.id,
      ),
    ).toBe(false);
  });
});
