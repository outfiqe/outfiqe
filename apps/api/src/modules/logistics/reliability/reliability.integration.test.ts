import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { BrandIncidentKind } from "#generated/prisma/enums.js";
import { createRoleLimitedStaffSession } from "#test/integration/auth-helpers.js";
import { createPurchasableProduct } from "#test/integration/order-fixtures.js";
import { createOwnerSessionForBrand } from "#test/integration/refund-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { BRAND_RELIABILITY_LEVEL, RELIABILITY_WARNING_INCIDENTS } from "./reliability.constants.js";

const DAYS_BEFORE_WINDOW = 31;

const recordIncidents = (brandId: string, incidentCount: number, occurredAt = new Date()) =>
  prisma.brandFulfilmentIncident.createMany({
    data: Array.from({ length: incidentCount }, () => ({
      brandId,
      kind: BrandIncidentKind.WASTED_VISIT,
      sourceKey: randomUUID(),
      occurredAt,
    })),
  });

describe("brand delivery reliability", () => {
  it("shows the brand its incidents from the last 30 days and warns at three", async () => {
    const { brand } = await createPurchasableProduct(1000);
    const owner = await createOwnerSessionForBrand(brand.id);
    await recordIncidents(brand.id, RELIABILITY_WARNING_INCIDENTS);
    await recordIncidents(brand.id, 1, subDays(new Date(), DAYS_BEFORE_WINDOW));

    const response = await request(testApp)
      .get("/api/logistics/brand/reliability")
      .set("Authorization", owner.authHeader);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data).toMatchObject({
      windowDays: 30,
      incidentCount: RELIABILITY_WARNING_INCIDENTS,
      level: BRAND_RELIABILITY_LEVEL.WARNING,
    });
    expect(response.body.data.incidents).toHaveLength(RELIABILITY_WARNING_INCIDENTS);
  });

  it("lists brands to watch for logistics staff, and keeps it from everyone else", async () => {
    const { brand } = await createPurchasableProduct(1000);
    const { brand: reliableBrand } = await createPurchasableProduct(1000);
    await recordIncidents(brand.id, RELIABILITY_WARNING_INCIDENTS);
    await recordIncidents(reliableBrand.id, 1);
    const staff = await createRoleLimitedStaffSession("platform:logistics:read");
    const otherStaff = await createRoleLimitedStaffSession("platform:orders:read");

    const response = await request(testApp)
      .get("/api/logistics/admin/brand-reliability")
      .set("Authorization", staff.authHeader);
    const refused = await request(testApp)
      .get("/api/logistics/admin/brand-reliability")
      .set("Authorization", otherStaff.authHeader);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.brands).toEqual([
      expect.objectContaining({
        brandId: brand.id,
        incidentCount: RELIABILITY_WARNING_INCIDENTS,
        level: BRAND_RELIABILITY_LEVEL.WARNING,
      }),
    ]);
    expect(refused.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});
