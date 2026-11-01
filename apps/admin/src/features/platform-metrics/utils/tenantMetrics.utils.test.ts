import { describe, expect, it } from "vitest";

import {
  describeTenantUsage,
  toLastUsedLabel,
  toPlanLabel,
  toSubscriptionLabel,
  toTenantCountLabel,
} from "./tenantMetrics.utils";

describe("tenant labels", () => {
  it("writes plans and statuses in plain words", () => {
    expect(toPlanLabel("trial")).toBe("Trial");
    expect(toSubscriptionLabel("PAST_DUE")).toBe("Payment overdue");
    expect(toSubscriptionLabel("SOMETHING_NEW")).toBe("Something_new");
    expect(toSubscriptionLabel(null)).toBeNull();
  });

  it("says a tenant was never used instead of showing a dash", () => {
    expect(toLastUsedLabel(null)).toBe("Never used");
  });

  it("counts businesses", () => {
    expect(toTenantCountLabel(1)).toBe("1 business");
    expect(toTenantCountLabel(6)).toBe("6 businesses");
  });
});

describe("describeTenantUsage", () => {
  it("explains a business that hasn't started", () => {
    expect(describeTenantUsage({ name: "Kiwi", memberCount: 1, lastCrmActivityAt: null })).toBe(
      "Kiwi has 1 member but hasn't used the CRM yet.",
    );
  });

  it("says when a business last used the CRM", () => {
    expect(
      describeTenantUsage({
        name: "Everlane",
        memberCount: 2,
        lastCrmActivityAt: "2026-09-16T00:00:00.000Z",
      }),
    ).toContain("Everlane has 2 members and last used the CRM on");
  });
});
