import { describe, expect, it } from "vitest";

import {
  brandApplicationSchema,
  brandApplicationStatusSchema,
} from "@/features/brand-applications/schemas";

describe("brandApplicationStatusSchema", () => {
  it("accepts each known status value", () => {
    for (const status of ["PENDING", "APPROVED", "REJECTED"]) {
      expect(brandApplicationStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects an unknown status value", () => {
    expect(brandApplicationStatusSchema.safeParse("ARCHIVED").success).toBe(false);
  });
});

describe("brandApplicationSchema", () => {
  const validApplication = {
    id: "app-1",
    brandName: "Test Atelier",
    contactName: "Jordan Lee",
    email: "jordan@example.com",
    phone: "9800000000",
    instagram: "@test.atelier",
    makesOwnPieces: "MAKES",
    status: "PENDING",
    reviewedAt: null,
    reviewedById: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("parses a valid application record", () => {
    expect(brandApplicationSchema.safeParse(validApplication).success).toBe(true);
  });

  it("rejects a record missing a required field", () => {
    const { brandName: _brandName, ...withoutBrandName } = validApplication;

    expect(brandApplicationSchema.safeParse(withoutBrandName).success).toBe(false);
  });

  it("rejects an invalid status value", () => {
    expect(
      brandApplicationSchema.safeParse({ ...validApplication, status: "UNKNOWN" }).success,
    ).toBe(false);
  });
});
