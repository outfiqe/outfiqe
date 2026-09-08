import { describe, expect, it } from "vitest";

import { canTransitionTagReview, resolveTagReviewStatus } from "./creatorLook.tagReview.js";

const base = {
  featureEnabled: true,
  brandPolicy: "TRUSTED_ONLY",
  autoApproveVerifiedBuyers: true,
  isVerifiedBuyer: false,
  isTrustedCreator: false,
} as const;

describe("resolveTagReviewStatus", () => {
  it("approves everything as POLICY_OPEN while the feature is off", () => {
    expect(
      resolveTagReviewStatus({
        ...base,
        featureEnabled: false,
        brandPolicy: "APPROVAL_REQUIRED",
      }),
    ).toEqual({ reviewStatus: "APPROVED", approvalSource: "POLICY_OPEN" });
  });

  it("auto-approves a verified buyer even under APPROVAL_REQUIRED when the toggle is on", () => {
    expect(
      resolveTagReviewStatus({
        ...base,
        brandPolicy: "APPROVAL_REQUIRED",
        isVerifiedBuyer: true,
      }),
    ).toEqual({ reviewStatus: "APPROVED", approvalSource: "VERIFIED_BUYER" });
  });

  it("ignores a verified buyer when the brand turned the toggle off", () => {
    expect(
      resolveTagReviewStatus({
        ...base,
        brandPolicy: "APPROVAL_REQUIRED",
        autoApproveVerifiedBuyers: false,
        isVerifiedBuyer: true,
      }),
    ).toEqual({ reviewStatus: "PENDING", approvalSource: null });
  });

  it("auto-approves anyone under OPEN", () => {
    expect(resolveTagReviewStatus({ ...base, brandPolicy: "OPEN" })).toEqual({
      reviewStatus: "APPROVED",
      approvalSource: "POLICY_OPEN",
    });
  });

  it("auto-approves a trusted creator under TRUSTED_ONLY, holds an untrusted one", () => {
    expect(resolveTagReviewStatus({ ...base, isTrustedCreator: true })).toEqual({
      reviewStatus: "APPROVED",
      approvalSource: "TRUSTED_CREATOR",
    });
    expect(resolveTagReviewStatus(base)).toEqual({
      reviewStatus: "PENDING",
      approvalSource: null,
    });
  });

  it("holds every tag under APPROVAL_REQUIRED for a non-buyer", () => {
    expect(
      resolveTagReviewStatus({
        ...base,
        brandPolicy: "APPROVAL_REQUIRED",
        isTrustedCreator: true,
      }),
    ).toEqual({ reviewStatus: "PENDING", approvalSource: null });
  });
});

describe("canTransitionTagReview", () => {
  it("allows the brand-review and re-request edges", () => {
    expect(canTransitionTagReview("PENDING", "APPROVED")).toBe(true);
    expect(canTransitionTagReview("PENDING", "REJECTED")).toBe(true);
    expect(canTransitionTagReview("APPROVED", "REJECTED")).toBe(true);
    expect(canTransitionTagReview("REJECTED", "PENDING")).toBe(true);
  });

  it("rejects re-approving without a brand action and other invalid edges", () => {
    expect(canTransitionTagReview("APPROVED", "PENDING")).toBe(false);
    expect(canTransitionTagReview("REJECTED", "APPROVED")).toBe(false);
    expect(canTransitionTagReview("PENDING", "PENDING")).toBe(false);
  });
});
