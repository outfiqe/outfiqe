import { describe, expect, it } from "vitest";

import type { CrmAuditEntry } from "../api/auditSchemas";
import { groupRepeatedEntries, toAuditActionLabel, toAuditSummary } from "./auditEntries.utils";

const toEntry = (overrides: Partial<CrmAuditEntry>): CrmAuditEntry => ({
  id: "a-1",
  action: "SUBSCRIPTION_CHECKOUT_STARTED",
  outcome: "SUCCESS",
  summary: "Started checkout",
  actorUserId: "u-1",
  actorName: "Bipin",
  targetType: null,
  targetId: null,
  metadata: {},
  ipAddress: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

describe("toAuditSummary", () => {
  it("fixes the seat wording on older entries", () => {
    expect(toAuditSummary("Started checkout for the pro plan (1 seats)")).toBe(
      "Started checkout for the pro plan (1 seat)",
    );
  });

  it("leaves other entries alone", () => {
    expect(toAuditSummary("Checkout (3 seats)")).toBe("Checkout (3 seats)");
  });
});

describe("toAuditActionLabel", () => {
  it("uses a plain label, and falls back for a new action", () => {
    expect(toAuditActionLabel("ROLE_CREATED")).toBe("Role created");
    expect(toAuditActionLabel("SOMETHING_NEW")).toBe("SOMETHING NEW");
  });
});

describe("groupRepeatedEntries", () => {
  it("folds repeats that sit next to each other", () => {
    const rows = groupRepeatedEntries([
      toEntry({ id: "a-1" }),
      toEntry({ id: "a-2" }),
      toEntry({ id: "a-3" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "a-1", occurrenceCount: 3 });
  });

  it("keeps entries apart when anything differs", () => {
    const rows = groupRepeatedEntries([
      toEntry({ id: "a-1" }),
      toEntry({ id: "a-2", actorUserId: "u-2" }),
      toEntry({ id: "a-3" }),
    ]);

    expect(rows.map(({ occurrenceCount }) => occurrenceCount)).toEqual([1, 1, 1]);
  });

  it("returns nothing for an empty log", () => {
    expect(groupRepeatedEntries([])).toEqual([]);
  });
});
