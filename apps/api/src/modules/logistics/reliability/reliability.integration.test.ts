import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { BrandIncidentKind, FulfilmentMode, PickupStatus } from "#generated/prisma/enums.js";
import { createRoleLimitedStaffSession } from "#test/integration/auth-helpers.js";
import {
  createBuyer,
  createOrder,
  createPurchasableProduct,
} from "#test/integration/order-fixtures.js";
import { createOwnerSessionForBrand } from "#test/integration/refund-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import {
  BRAND_RELIABILITY_LEVEL,
  NEW_BRAND_GRACE,
  RELIABILITY_THRESHOLDS,
  RELIABILITY_WATCH_LIST_MIN_INCIDENTS,
} from "./reliability.constants.js";

const DAYS_BEFORE_WINDOW = 31;
const DAYS_PAST_GRACE = NEW_BRAND_GRACE.days + 1;
const RECENT_PICKUP_COUNT = 30;
const WARNING_INCIDENT_COUNT = RELIABILITY_THRESHOLDS.warning.minIncidents;

const recordIncidents = (brandId: string, incidentCount: number, occurredAt = new Date()) =>
  prisma.brandFulfilmentIncident.createMany({
    data: Array.from({ length: incidentCount }, () => ({
      brandId,
      kind: BrandIncidentKind.WASTED_VISIT,
      sourceKey: randomUUID(),
      occurredAt,
    })),
  });

const recordHubPickups = async (brandId: string, pickupCount: number, createdAt: Date) => {
  const buyer = await createBuyer();
  for (let pickupIndex = 0; pickupIndex < pickupCount; pickupIndex += 1) {
    const order = await createOrder(buyer.id);
    await prisma.orderFulfilmentGroup.create({
      data: {
        orderId: order.id,
        brandId,
        fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
        pickupStatus: PickupStatus.AWAITING_BRAND,
        createdAt,
      },
    });
  }
};

const createEstablishedBrand = async () => {
  const { brand } = await createPurchasableProduct(1000);
  await recordHubPickups(brand.id, NEW_BRAND_GRACE.pickups, subDays(new Date(), DAYS_PAST_GRACE));
  await recordHubPickups(brand.id, RECENT_PICKUP_COUNT, new Date());
  return brand;
};

const readMyReliability = async (brandId: string) => {
  const owner = await createOwnerSessionForBrand(brandId);
  return request(testApp)
    .get("/api/logistics/brand/reliability")
    .set("Authorization", owner.authHeader);
};

describe("brand delivery reliability", () => {
  it("warns an established brand when its problems pass the rate, counting only the last 30 days", async () => {
    const brand = await createEstablishedBrand();
    await recordIncidents(brand.id, WARNING_INCIDENT_COUNT);
    await recordIncidents(brand.id, 1, subDays(new Date(), DAYS_BEFORE_WINDOW));

    const response = await readMyReliability(brand.id);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data).toMatchObject({
      windowDays: 30,
      incidentCount: WARNING_INCIDENT_COUNT,
      pickupCount: RECENT_PICKUP_COUNT,
      incidentRatePercent: 17,
      isNewToPickup: false,
      level: BRAND_RELIABILITY_LEVEL.WARNING,
    });
    expect(response.body.data.incidents).toHaveLength(WARNING_INCIDENT_COUNT);
  });

  it("keeps a busy brand in good standing when its problems are a small share of pickups", async () => {
    const brand = await createEstablishedBrand();
    await recordHubPickups(brand.id, RECENT_PICKUP_COUNT, new Date());
    await recordIncidents(brand.id, WARNING_INCIDENT_COUNT);

    const response = await readMyReliability(brand.id);

    expect(response.body.data).toMatchObject({
      incidentCount: WARNING_INCIDENT_COUNT,
      level: BRAND_RELIABILITY_LEVEL.GOOD,
    });
  });

  it("doesn't warn a brand that is new to Outfiqe pickup", async () => {
    const { brand } = await createPurchasableProduct(1000);
    await recordHubPickups(brand.id, WARNING_INCIDENT_COUNT, new Date());
    await recordIncidents(brand.id, WARNING_INCIDENT_COUNT);

    const response = await readMyReliability(brand.id);

    expect(response.body.data).toMatchObject({
      incidentCount: WARNING_INCIDENT_COUNT,
      isNewToPickup: true,
      level: BRAND_RELIABILITY_LEVEL.GOOD,
    });
  });

  it("lists brands with three or more problems for logistics staff, and keeps it from everyone else", async () => {
    const brand = await createEstablishedBrand();
    const { brand: reliableBrand } = await createPurchasableProduct(1000);
    await recordIncidents(brand.id, RELIABILITY_WATCH_LIST_MIN_INCIDENTS);
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
        incidentCount: RELIABILITY_WATCH_LIST_MIN_INCIDENTS,
        pickupCount: RECENT_PICKUP_COUNT,
        incidentRatePercent: 10,
        isNewToPickup: false,
        level: BRAND_RELIABILITY_LEVEL.GOOD,
      }),
    ]);
    expect(refused.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});
