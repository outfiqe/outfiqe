import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { createRoleLimitedStaffSession } from "#test/integration/auth-helpers.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  BUDGET_ABOVE_THRESHOLD,
  BUDGET_BELOW_THRESHOLD,
  checkoutOnceWithCoupon,
  createActiveCommissionRule,
  createCoupon,
  createCouponAdmin,
  createDefaultDeliveryZone,
} from "#test/integration/coupon-fixtures.js";
import { UNRELATED_PLATFORM_PERMISSION_KEY } from "#test/integration/crm-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

describe("POST /api/admin/coupons", () => {
  it("creates a coupon", async () => {
    const { authHeader } = await createCouponAdmin();

    const response = await request(testApp)
      .post("/api/admin/coupons")
      .set("Authorization", authHeader)
      .send({
        code: "welcome300",
        type: "FIXED",
        fixedAmount: 300,
        startsAt: new Date().toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.data.code).toBe("WELCOME300");
    expect(response.body.data.fixedAmount).toBe(300);
    expect(response.body.data.status).toBe("ACTIVE");
  });

  it("rejects a duplicate code", async () => {
    const { authHeader, userId } = await createCouponAdmin();
    await createCoupon({ code: "DUPE1", createdById: userId });

    const response = await request(testApp)
      .post("/api/admin/coupons")
      .set("Authorization", authHeader)
      .send({ code: "dupe1", type: "FIXED", fixedAmount: 100, startsAt: new Date().toISOString() });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("COUPON_CODE_ALREADY_EXISTS");
  });

  it("starts paused and pending approval once the budget exceeds the approval threshold", async () => {
    const { authHeader } = await createCouponAdmin();

    const response = await request(testApp)
      .post("/api/admin/coupons")
      .set("Authorization", authHeader)
      .send({
        code: "bigbudget",
        type: "FIXED",
        fixedAmount: 300,
        startsAt: new Date().toISOString(),
        totalBudgetAmount: BUDGET_ABOVE_THRESHOLD,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("PAUSED");
    expect(response.body.data.requiresApproval).toBe(true);
    expect(response.body.data.approvedById).toBeNull();
  });

  it("goes straight to active when the budget is under the approval threshold", async () => {
    const { authHeader } = await createCouponAdmin();

    const response = await request(testApp)
      .post("/api/admin/coupons")
      .set("Authorization", authHeader)
      .send({
        code: "smallbudget",
        type: "FIXED",
        fixedAmount: 300,
        startsAt: new Date().toISOString(),
        totalBudgetAmount: BUDGET_BELOW_THRESHOLD,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data.requiresApproval).toBe(false);
  });
});

describe("PATCH /api/admin/coupons/:id/approve", () => {
  it("refuses activation before approval", async () => {
    const { authHeader, userId } = await createCouponAdmin();
    const coupon = await createCoupon({
      createdById: userId,
      totalBudgetAmount: BUDGET_ABOVE_THRESHOLD,
    });
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { status: "PAUSED", requiresApproval: true },
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/status`)
      .set("Authorization", authHeader)
      .send({ status: "ACTIVE" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("COUPON_APPROVAL_REQUIRED");
  });

  it("refuses a same-admin sign-off", async () => {
    const { authHeader, userId } = await createCouponAdmin();
    const coupon = await createCoupon({
      createdById: userId,
      totalBudgetAmount: BUDGET_ABOVE_THRESHOLD,
    });
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { status: "PAUSED", requiresApproval: true },
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/approve`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SAME_ADMIN_SIGN_OFF");
  });

  it("activates the coupon once a different admin approves", async () => {
    const { userId: creatorId } = await createAdminSession();
    const { authHeader: approverAuthHeader, userId: approverId } = await createCouponAdmin();
    const coupon = await createCoupon({
      createdById: creatorId,
      totalBudgetAmount: BUDGET_ABOVE_THRESHOLD,
    });
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { status: "PAUSED", requiresApproval: true },
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/approve`)
      .set("Authorization", approverAuthHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data.approvedById).toBe(approverId);
    expect(response.body.data.approvedAt).not.toBeNull();
  });
});

describe("PATCH /api/admin/coupons/:id/budget", () => {
  it("re-requires approval when a budget raise crosses the threshold", async () => {
    const { authHeader, userId } = await createCouponAdmin();
    const coupon = await createCoupon({
      createdById: userId,
      totalBudgetAmount: BUDGET_BELOW_THRESHOLD,
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/budget`)
      .set("Authorization", authHeader)
      .send({ totalBudgetAmount: BUDGET_ABOVE_THRESHOLD, maxRedemptions: null });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("PAUSED");
    expect(response.body.data.requiresApproval).toBe(true);
    expect(response.body.data.approvedById).toBeNull();
  });

  it("doesn't require re-approval for a raise that stays under the threshold", async () => {
    const { authHeader, userId } = await createCouponAdmin();
    const coupon = await createCoupon({
      createdById: userId,
      totalBudgetAmount: 5_000,
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/budget`)
      .set("Authorization", authHeader)
      .send({ totalBudgetAmount: BUDGET_BELOW_THRESHOLD, maxRedemptions: null });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data.requiresApproval).toBe(false);
  });
});

describe("GET /api/admin/coupons", () => {
  it("filters the list by status", async () => {
    const { authHeader, userId } = await createAdminSession();
    await createCoupon({ createdById: userId });
    const paused = await createCoupon({ createdById: userId });
    await prisma.coupon.update({ where: { id: paused.id }, data: { status: "PAUSED" } });

    const response = await request(testApp)
      .get("/api/admin/coupons?status=PAUSED")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.coupons.every((c: { status: string }) => c.status === "PAUSED")).toBe(
      true,
    );
  });
});

describe("PATCH /api/admin/coupons/:id/status", () => {
  it("pauses an active coupon", async () => {
    const { authHeader, userId } = await createCouponAdmin();
    const coupon = await createCoupon({ createdById: userId });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/status`)
      .set("Authorization", authHeader)
      .send({ status: "PAUSED" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("PAUSED");
  });

  it("blocks a platform staffer without platform:coupons:manage", async () => {
    const { authHeader, userId } = await createRoleLimitedStaffSession(
      UNRELATED_PLATFORM_PERMISSION_KEY,
    );
    const coupon = await createCoupon({ createdById: userId });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/status`)
      .set("Authorization", authHeader)
      .send({ status: "PAUSED" });

    expect(response.status).toBe(403);
  });
});

describe("GET /api/admin/coupons/:id/performance", () => {
  it("reports zeroed metrics for a coupon with no redemptions", async () => {
    const { authHeader, userId } = await createAdminSession();
    const coupon = await createCoupon({ createdById: userId });

    const response = await request(testApp)
      .get(`/api/admin/coupons/${coupon.id}/performance`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      redemptionCount: 0,
      totalDiscountAmount: 0,
      totalGmv: 0,
      netMargin: 0,
    });
  });

  it("aggregates GMV, spend, and commission across redemptions", async () => {
    const { authHeader, userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId, 1_000);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 500 });

    await checkoutOnceWithCoupon(coupon.code, 2_000);
    await checkoutOnceWithCoupon(coupon.code, 2_000);

    const response = await request(testApp)
      .get(`/api/admin/coupons/${coupon.id}/performance`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      redemptionCount: 2,
      totalDiscountAmount: 1_000,
      totalPlatformFundedAmount: 1_000,
      totalGmv: 4_000,
      totalPlatformFeeCollected: 400,
      netMargin: -600,
      newCustomerCount: 2,
      returningCustomerCount: 0,
    });
  });
});

describe("GET /api/admin/coupons/redemptions", () => {
  it("finds a redemption by coupon code and by order id", async () => {
    const { authHeader, userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 300 });

    const { checkout } = await checkoutOnceWithCoupon(coupon.code, 2_000);
    expect(checkout.status).toBe(201);

    const byCode = await request(testApp)
      .get(`/api/admin/coupons/redemptions?code=${coupon.code}`)
      .set("Authorization", authHeader);
    expect(byCode.status).toBe(200);
    expect(byCode.body.data.redemptions).toHaveLength(1);
    expect(byCode.body.data.redemptions[0].couponCode).toBe(coupon.code);

    const byOrder = await request(testApp)
      .get(`/api/admin/coupons/redemptions?orderId=${checkout.body.data.id}`)
      .set("Authorization", authHeader);
    expect(byOrder.status).toBe(200);
    expect(byOrder.body.data.redemptions).toHaveLength(1);
    expect(byOrder.body.data.redemptions[0].orderId).toBe(checkout.body.data.id);
  });
});
