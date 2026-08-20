import { describe, expect, it } from "vitest";

import type { BrandRecord } from "./brand.types.js";
import { toPublicBrandProfile } from "./brand.utils.js";

const baseBrand: BrandRecord = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Studio Nine",
  contactName: "Contact Person",
  email: "contact@studionine.test",
  phone: "9811111111",
  instagram: "@studionine",
  avatarUrl: "https://cdn.outfiqe.test/avatar.jpg",
  bannerUrl: "https://cdn.outfiqe.test/banner.jpg",
  madeInNepal: true,
  applicationId: null,
  followerCount: 42,
  rating: 4.5,
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
      bannerUrl: baseBrand.bannerUrl,
      madeInNepal: baseBrand.madeInNepal,
      rating: baseBrand.rating,
      productCount: 7,
      followerCount: baseBrand.followerCount,
      isFollowing: true,
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
