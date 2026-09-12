import { describe, expect, it } from "vitest";

import { AccountStatus } from "#generated/prisma/enums.js";

import type { BrandWithImageAssets } from "./brand.types.js";
import { toPublicBrandProfile } from "./brand.utils.js";

const baseBrand: BrandWithImageAssets = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Studio Nine",
  contactName: "Contact Person",
  email: "contact@studionine.test",
  phone: "9811111111",
  instagram: "@studionine",
  avatarUrl: "https://cdn.outfiqe.test/avatar.jpg",
  avatarImageAssetId: null,
  avatarImageAsset: null,
  bannerUrl: "https://cdn.outfiqe.test/banner.jpg",
  bannerImageAssetId: null,
  bannerImageAsset: null,
  madeInNepal: true,
  applicationId: null,
  followerCount: 42,
  rating: 4.5,
  tagReviewPolicy: "TRUSTED_ONLY",
  autoApproveVerifiedBuyers: true,
  accountStatus: AccountStatus.ACTIVE,
  suspendedAt: null,
  suspendedBy: null,
  suspensionReason: null,
  suspensionExpiresAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("toPublicBrandProfile", () => {
  it("maps a brand record into its public shape, carrying the caller-provided counts", () => {
    const profile = toPublicBrandProfile(baseBrand, 7, true);

    expect(profile).toEqual({
      id: baseBrand.id,
      name: baseBrand.name,
      avatarUrl: baseBrand.avatarUrl,
      avatarImage: { url: baseBrand.avatarUrl, lqip: null, sources: [] },
      bannerUrl: baseBrand.bannerUrl,
      bannerImage: { url: baseBrand.bannerUrl, lqip: null, sources: [] },
      madeInNepal: baseBrand.madeInNepal,
      rating: baseBrand.rating,
      productCount: 7,
      followerCount: baseBrand.followerCount,
      isFollowing: true,
      contactUserId: null,
    });
  });

  it("never leaks internal-only fields like email, phone, contactName, or applicationId", () => {
    const profile = toPublicBrandProfile(baseBrand, 0, false);

    expect(profile).not.toHaveProperty("email");
    expect(profile).not.toHaveProperty("phone");
    expect(profile).not.toHaveProperty("contactName");
    expect(profile).not.toHaveProperty("instagram");
    expect(profile).not.toHaveProperty("applicationId");
    expect(profile).not.toHaveProperty("createdAt");
    expect(profile).not.toHaveProperty("updatedAt");
  });

  it("passes through a null avatarUrl, bannerUrl, and rating unchanged", () => {
    const profile = toPublicBrandProfile(
      { ...baseBrand, avatarUrl: null, bannerUrl: null, rating: null },
      3,
      false,
    );

    expect(profile.avatarUrl).toBeNull();
    expect(profile.bannerUrl).toBeNull();
    expect(profile.rating).toBeNull();
  });

  it("reflects isFollowing as false when the caller isn't following", () => {
    const profile = toPublicBrandProfile(baseBrand, 1, false);

    expect(profile.isFollowing).toBe(false);
  });
});
