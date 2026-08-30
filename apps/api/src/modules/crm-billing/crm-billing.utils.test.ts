import { addDays } from "date-fns/addDays";
import { describe, expect, it } from "vitest";

import { SubscriptionStatus } from "#generated/prisma/enums.js";

import { CRM_PLAN_ID } from "./crm-billing.constants.js";
import {
  calculateInvoiceAmount,
  clampSeatsToPlan,
  getPlanDefinition,
  isAdvancedCrmEnabled,
} from "./crm-billing.utils.js";

const future = addDays(new Date(), 5);
const past = addDays(new Date(), -5);

describe("getPlanDefinition", () => {
  it("returns a known plan and null for anything else", () => {
    expect(getPlanDefinition(CRM_PLAN_ID.STARTER)?.name).toBe("Starter");
    expect(getPlanDefinition("enterprise")).toBeNull();
  });
});

describe("clampSeatsToPlan", () => {
  it("clamps to the plan's seat bounds", () => {
    expect(clampSeatsToPlan(CRM_PLAN_ID.STARTER, 0)).toBe(1);
    expect(clampSeatsToPlan(CRM_PLAN_ID.STARTER, 50)).toBe(10);
    expect(clampSeatsToPlan(CRM_PLAN_ID.GROWTH, 1)).toBe(5);
  });
});

describe("calculateInvoiceAmount", () => {
  it("multiplies the per-seat price by the seat count", () => {
    expect(calculateInvoiceAmount(CRM_PLAN_ID.STARTER, 3)).toBe(2700);
    expect(calculateInvoiceAmount(CRM_PLAN_ID.GROWTH, 5)).toBe(3500);
  });
});

describe("isAdvancedCrmEnabled", () => {
  it("is always true for the platform organization", () => {
    expect(isAdvancedCrmEnabled({ isPlatformOrg: true, trialEndsAt: past }, null)).toBe(true);
  });

  it("follows an active subscription regardless of period end", () => {
    expect(
      isAdvancedCrmEnabled(
        { isPlatformOrg: false, trialEndsAt: null },
        { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: past },
      ),
    ).toBe(true);
  });

  it("keeps a trialing subscription enabled only until its period ends", () => {
    expect(
      isAdvancedCrmEnabled(
        { isPlatformOrg: false, trialEndsAt: null },
        { status: SubscriptionStatus.TRIALING, currentPeriodEnd: future },
      ),
    ).toBe(true);
    expect(
      isAdvancedCrmEnabled(
        { isPlatformOrg: false, trialEndsAt: null },
        { status: SubscriptionStatus.TRIALING, currentPeriodEnd: past },
      ),
    ).toBe(false);
  });

  it("falls back to the organization trial window when there is no subscription", () => {
    expect(isAdvancedCrmEnabled({ isPlatformOrg: false, trialEndsAt: future }, null)).toBe(true);
    expect(isAdvancedCrmEnabled({ isPlatformOrg: false, trialEndsAt: past }, null)).toBe(false);
    expect(isAdvancedCrmEnabled({ isPlatformOrg: false, trialEndsAt: null }, null)).toBe(false);
  });

  it("denies a past-due or canceled subscription", () => {
    for (const status of [SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED]) {
      expect(
        isAdvancedCrmEnabled(
          { isPlatformOrg: false, trialEndsAt: future },
          { status, currentPeriodEnd: future },
        ),
      ).toBe(false);
    }
  });
});
