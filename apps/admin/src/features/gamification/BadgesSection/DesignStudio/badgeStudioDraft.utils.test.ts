import { beforeEach, describe, expect, it } from "vitest";

import type { BadgeAdmin } from "../../schemas";
import { EMPTY_FORM } from "../badgeForm.constants";
import {
  clearBadgeStudioDraft,
  readBadgeStudioDraft,
  resolveCreateFormFromDraft,
  resolveEditingBadgeFromDraft,
  writeBadgeStudioDraft,
} from "./badgeStudioDraft.utils";

const badgeFixture: BadgeAdmin = {
  id: "badge-1",
  name: "Fashion Warrior",
  description: "Wore ten looks",
  category: "SPECIAL",
  rarity: "LEGENDARY",
  icon: "❤",
  designConfig: { shape: "circle", primaryColor: "#94a3b8" },
  xpReward: 0,
  isPermanent: true,
  isDynamic: false,
  isPublic: true,
  isActive: true,
  assignmentLimit: 5,
  assignmentCount: 0,
  isTitleEligible: false,
  sponsorBrand: null,
  achievement: null,
};

describe("writeBadgeStudioDraft / readBadgeStudioDraft / clearBadgeStudioDraft", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns null when nothing has been written yet", () => {
    expect(readBadgeStudioDraft()).toBeNull();
  });

  it("round-trips a written draft", () => {
    const draft = { mode: "create" as const, form: { ...EMPTY_FORM, name: "Trailblazer" } };
    writeBadgeStudioDraft(draft);
    expect(readBadgeStudioDraft()).toEqual(draft);
  });

  it("returns null after the draft is cleared", () => {
    writeBadgeStudioDraft({ mode: "create", form: EMPTY_FORM });
    clearBadgeStudioDraft();
    expect(readBadgeStudioDraft()).toBeNull();
  });
});

describe("resolveCreateFormFromDraft", () => {
  it("returns null when there is no draft", () => {
    expect(resolveCreateFormFromDraft(null)).toBeNull();
  });

  it("returns null when the draft is for an edit session", () => {
    const draft = {
      mode: "edit" as const,
      badge: badgeFixture,
      form: EMPTY_FORM,
      isActive: true,
      achievementIsActive: true,
    };
    expect(resolveCreateFormFromDraft(draft)).toBeNull();
  });

  it("returns the draft's form when resuming a create session", () => {
    const form = { ...EMPTY_FORM, name: "Trailblazer" };
    expect(resolveCreateFormFromDraft({ mode: "create", form })).toBe(form);
  });
});

describe("resolveEditingBadgeFromDraft", () => {
  it("returns null when there is no draft", () => {
    expect(resolveEditingBadgeFromDraft(null)).toBeNull();
  });

  it("returns null when the draft is for a create session", () => {
    expect(resolveEditingBadgeFromDraft({ mode: "create", form: EMPTY_FORM })).toBeNull();
  });

  it("returns the badge and a form override when resuming an edit session", () => {
    const form = { ...EMPTY_FORM, name: "Updated name", studioLayers: [] };

    const result = resolveEditingBadgeFromDraft({
      mode: "edit",
      badge: badgeFixture,
      form,
      isActive: false,
      achievementIsActive: true,
    });

    expect(result).toEqual({
      badge: badgeFixture,
      formOverride: { form, isActive: false, achievementIsActive: true },
    });
  });
});
