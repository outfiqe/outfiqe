import { describe, expect, it } from "vitest";

import { ALLOWED_SUPPORT_TRANSITIONS, SUPPORT_STATUS_VALUES, supportTicketSchema } from "./schemas";

describe("ALLOWED_SUPPORT_TRANSITIONS", () => {
  it("covers every status and never self-transitions", () => {
    for (const status of SUPPORT_STATUS_VALUES) {
      expect(ALLOWED_SUPPORT_TRANSITIONS[status]).toBeDefined();
      expect(ALLOWED_SUPPORT_TRANSITIONS[status]).not.toContain(status);
    }
  });

  it("keeps NEW away from RESOLVED and makes CLOSED reopen-only", () => {
    expect(ALLOWED_SUPPORT_TRANSITIONS.NEW).not.toContain("RESOLVED");
    expect(ALLOWED_SUPPORT_TRANSITIONS.CLOSED).toEqual(["OPEN"]);
  });
});

describe("supportTicketSchema", () => {
  it("parses a minimal ticket payload", () => {
    const parsed = supportTicketSchema.parse({
      id: "t-1",
      reference: "OFQ-1",
      ticketNumber: 1,
      requesterUserId: null,
      requesterEmail: "a@b.test",
      requesterName: "A",
      segment: "GUEST",
      category: "OTHER",
      subject: "Hi",
      status: "NEW",
      priority: "NORMAL",
      assigneeUserId: null,
      assigneeName: null,
      relatedOrderId: null,
      relatedBrandId: null,
      relatedBrandName: null,
      firstRespondedAt: null,
      resolvedAt: null,
      lastCustomerAt: null,
      messageCount: 1,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(parsed.reference).toBe("OFQ-1");
  });
});
