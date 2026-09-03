import { describe, expect, it } from "vitest";

import { SupportStatus } from "#generated/prisma/enums.js";

import {
  ALLOWED_SUPPORT_TRANSITIONS,
  formatReference,
  parseReference,
  REOPENABLE_STATUSES,
} from "./support.constants.js";

describe("formatReference / parseReference", () => {
  it("round-trips a ticket number through the OFQ prefix", () => {
    expect(formatReference(1042)).toBe("OFQ-1042");
    expect(parseReference("OFQ-1042")).toBe(1042);
  });

  it("parses loose user input (bare number, spacing, lower case)", () => {
    expect(parseReference("1042")).toBe(1042);
    expect(parseReference("  ofq 1042 ")).toBe(1042);
    expect(parseReference("OFQ1042")).toBe(1042);
  });

  it("rejects nonsense", () => {
    expect(parseReference("abc")).toBeNull();
    expect(parseReference("OFQ-0")).toBeNull();
    expect(parseReference("OFQ--12")).toBeNull();
  });
});

describe("ALLOWED_SUPPORT_TRANSITIONS", () => {
  it("has an entry for every status", () => {
    for (const status of Object.values(SupportStatus)) {
      expect(ALLOWED_SUPPORT_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("never lists a status as a transition to itself", () => {
    for (const [from, targets] of Object.entries(ALLOWED_SUPPORT_TRANSITIONS)) {
      expect(targets).not.toContain(from);
    }
  });

  it("only ever reaches RESOLVED from an active status, and CLOSED is terminal but reopenable", () => {
    expect(ALLOWED_SUPPORT_TRANSITIONS[SupportStatus.NEW]).not.toContain(SupportStatus.RESOLVED);
    expect(ALLOWED_SUPPORT_TRANSITIONS[SupportStatus.CLOSED]).toEqual([SupportStatus.OPEN]);
    expect(REOPENABLE_STATUSES).toEqual([SupportStatus.RESOLVED, SupportStatus.CLOSED]);
  });
});
