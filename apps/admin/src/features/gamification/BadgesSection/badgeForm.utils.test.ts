import { describe, expect, it } from "vitest";

import type { BadgeAdmin } from "../schemas";
import { EMPTY_FORM } from "./badgeForm.constants";
import { formForBadge, toFormInput, toPreviewDesignConfig } from "./badgeForm.utils";

const baseBadge: BadgeAdmin = {
  id: "badge-1",
  name: "Trailblazer",
  description: "Wore ten looks",
  category: "SPECIAL",
  rarity: "RARE",
  icon: "🌟",
  designConfig: { shape: "shield", primaryColor: "#1d4ed8" },
  xpReward: 25,
  isPermanent: true,
  isDynamic: false,
  isPublic: true,
  isActive: true,
  assignmentLimit: null,
  assignmentCount: 0,
  isTitleEligible: false,
  sponsorBrand: null,
  achievement: {
    id: "ach-1",
    requirementType: "ENGAGEMENT",
    requirementConfig: { conditions: [{ metric: "total_likes", operator: "gte", value: 5 }] },
    isActive: true,
    activeFrom: null,
    activeUntil: null,
  },
};

describe("formForBadge", () => {
  it("maps a simple-design badge with no custom image", () => {
    const form = formForBadge(baseBadge);
    expect(form).toMatchObject({
      name: "Trailblazer",
      icon: "🌟",
      iconImageUrl: "",
      shape: "shield",
      primaryColor: "#1d4ed8",
      designMode: "simple",
      studioLayers: [],
    });
  });

  it("reads a legacy design's imageUrl into iconImageUrl", () => {
    const form = formForBadge({
      ...baseBadge,
      designConfig: { shape: "circle", primaryColor: "#000000", imageUrl: "https://cdn/i.png" },
    });
    expect(form.iconImageUrl).toBe("https://cdn/i.png");
  });

  it("maps a studio-design badge to studio mode with no iconImageUrl", () => {
    const form = formForBadge({
      ...baseBadge,
      designConfig: {
        version: 2,
        layers: [
          {
            id: "img",
            type: "image",
            url: "https://cdn/l.png",
            fit: "cover",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          },
        ],
      },
    });
    expect(form.designMode).toBe("studio");
    expect(form.iconImageUrl).toBe("");
    expect(form.studioLayers).toHaveLength(1);
  });
});

describe("toFormInput", () => {
  it("falls back to the default emoji when the icon field is left blank", () => {
    expect(toFormInput({ ...EMPTY_FORM, icon: "" }).icon).toBe("🏆");
    expect(toFormInput({ ...EMPTY_FORM, icon: "  " }).icon).toBe("🏆");
    expect(toFormInput({ ...EMPTY_FORM, icon: "⭐" }).icon).toBe("⭐");
  });

  it("includes imageUrl in a simple designConfig when iconImageUrl is set", () => {
    const input = toFormInput({ ...EMPTY_FORM, iconImageUrl: "https://cdn/i.png" });
    expect(input.designConfig).toMatchObject({ shape: "circle", imageUrl: "https://cdn/i.png" });
  });

  it("omits imageUrl from a simple designConfig when iconImageUrl is empty", () => {
    const input = toFormInput({ ...EMPTY_FORM, iconImageUrl: "" });
    expect(input.designConfig).not.toHaveProperty("imageUrl");
  });

  it("emits a studio designConfig with layers and no imageUrl key", () => {
    const input = toFormInput({
      ...EMPTY_FORM,
      designMode: "studio",
      iconImageUrl: "https://cdn/i.png",
      studioLayers: [
        {
          id: "img",
          type: "image",
          url: "https://cdn/l.png",
          fit: "contain",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ],
    });
    expect(input.designConfig).not.toHaveProperty("imageUrl");
    expect(input.designConfig).toMatchObject({ version: 2 });
  });

  it("round-trips a simple custom-image badge through formForBadge and back", () => {
    const badge: BadgeAdmin = {
      ...baseBadge,
      designConfig: { shape: "star", primaryColor: "#abcdef", imageUrl: "https://cdn/x.png" },
    };
    expect(toFormInput(formForBadge(badge)).designConfig).toMatchObject({
      shape: "star",
      imageUrl: "https://cdn/x.png",
    });
  });
});

describe("toPreviewDesignConfig", () => {
  it("returns a legacy config with the emoji shape/colour for simple mode", () => {
    expect(toPreviewDesignConfig({ ...EMPTY_FORM, shape: "hexagon", primaryColor: "#111" })).toEqual(
      { shape: "hexagon", primaryColor: "#111" },
    );
  });

  it("adds imageUrl and a non-auto animation to the legacy preview", () => {
    expect(
      toPreviewDesignConfig({
        ...EMPTY_FORM,
        iconImageUrl: "https://cdn/i.png",
        animation: "glow",
      }),
    ).toMatchObject({ imageUrl: "https://cdn/i.png", animation: "glow" });
  });

  it("returns the studio layers when studio mode has any", () => {
    const config = toPreviewDesignConfig({
      ...EMPTY_FORM,
      designMode: "studio",
      studioLayers: [
        { id: "l", type: "icon", glyph: "x", fontSize: 20, x: 0, y: 0, width: 10, height: 10 },
      ],
    });
    expect(config).toMatchObject({ version: 2 });
  });

  it("falls back to the legacy shape/colour when studio mode has no layers yet", () => {
    expect(
      toPreviewDesignConfig({ ...EMPTY_FORM, designMode: "studio", studioLayers: [] }),
    ).not.toHaveProperty("version");
  });
});
