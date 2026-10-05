import { describe, expect, it } from "vitest";

import { FeatureFlagRollout } from "#generated/prisma/enums.js";

import {
  defaultFeatureFlagState,
  findMissingIds,
  isFlagOnFor,
  needsBrandMembershipLookup,
  pickInOrder,
} from "./feature-flags.utils.js";

const ALLOWED_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const ALLOWED_BRAND_ID = "33333333-3333-4333-8333-333333333333";

const allowListFlag = {
  rollout: FeatureFlagRollout.ALLOW_LIST,
  allowedUserIds: [ALLOWED_USER_ID],
  allowedBrandIds: [ALLOWED_BRAND_ID],
};

describe("isFlagOnFor", () => {
  it("is off for everyone when the rollout is OFF, even people on the allow list", () => {
    const flag = { ...allowListFlag, rollout: FeatureFlagRollout.OFF };
    expect(isFlagOnFor(flag, { userId: ALLOWED_USER_ID, brandIds: [ALLOWED_BRAND_ID] })).toBe(
      false,
    );
  });

  it("is on for everyone, signed in or not, when the rollout is EVERYONE", () => {
    const flag = { ...allowListFlag, rollout: FeatureFlagRollout.EVERYONE };
    expect(isFlagOnFor(flag, { userId: null, brandIds: [] })).toBe(true);
  });

  it("is on for an allow-listed person", () => {
    expect(isFlagOnFor(allowListFlag, { userId: ALLOWED_USER_ID, brandIds: [] })).toBe(true);
  });

  it("is on for a member of an allow-listed brand", () => {
    expect(
      isFlagOnFor(allowListFlag, { userId: OTHER_USER_ID, brandIds: [ALLOWED_BRAND_ID] }),
    ).toBe(true);
  });

  it("is off for anyone else, including visitors who aren't signed in", () => {
    expect(isFlagOnFor(allowListFlag, { userId: OTHER_USER_ID, brandIds: [] })).toBe(false);
    expect(isFlagOnFor(allowListFlag, { userId: null, brandIds: [] })).toBe(false);
  });
});

describe("needsBrandMembershipLookup", () => {
  it("only looks up brand memberships when an allow-list flag names brands", () => {
    expect(needsBrandMembershipLookup(allowListFlag)).toBe(true);
    expect(needsBrandMembershipLookup({ ...allowListFlag, allowedBrandIds: [] })).toBe(false);
    expect(
      needsBrandMembershipLookup({ ...allowListFlag, rollout: FeatureFlagRollout.EVERYONE }),
    ).toBe(false);
  });
});

describe("defaultFeatureFlagState", () => {
  it("starts every flag switched off with empty allow lists", () => {
    expect(defaultFeatureFlagState("outfit_builder")).toEqual({
      key: "outfit_builder",
      rollout: FeatureFlagRollout.OFF,
      allowedUserIds: [],
      allowedBrandIds: [],
      updatedAt: null,
    });
  });
});

describe("findMissingIds", () => {
  it("lists the requested ids that don't exist", () => {
    expect(findMissingIds([ALLOWED_USER_ID, OTHER_USER_ID], [ALLOWED_USER_ID])).toEqual([
      OTHER_USER_ID,
    ]);
  });
});

describe("pickInOrder", () => {
  it("returns the entries in the allow list's order and skips ids that no longer exist", () => {
    const entryById = new Map([
      [ALLOWED_USER_ID, { id: ALLOWED_USER_ID, name: "Sita" }],
      [ALLOWED_BRAND_ID, { id: ALLOWED_BRAND_ID, name: "Kastha" }],
    ]);

    expect(pickInOrder([ALLOWED_BRAND_ID, OTHER_USER_ID, ALLOWED_USER_ID], entryById)).toEqual([
      { id: ALLOWED_BRAND_ID, name: "Kastha" },
      { id: ALLOWED_USER_ID, name: "Sita" },
    ]);
  });
});
