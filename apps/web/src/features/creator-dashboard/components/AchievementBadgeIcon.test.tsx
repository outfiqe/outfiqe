import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BadgeDesignConfig, BadgeRarityValue } from "../api/badgeSchemas";
import { AchievementBadgeIcon } from "./AchievementBadgeIcon";

const baseDesignConfig: BadgeDesignConfig = { shape: "circle", primaryColor: "#f97316" };

const renderIcon = (
  overrides: Partial<{
    designConfig: BadgeDesignConfig;
    rarity: BadgeRarityValue;
    isLocked: boolean;
  }> = {},
) =>
  render(
    <AchievementBadgeIcon
      icon="🏆"
      designConfig={overrides.designConfig ?? baseDesignConfig}
      rarity={overrides.rarity ?? "COMMON"}
      isLocked={overrides.isLocked ?? false}
    />,
  );

describe("AchievementBadgeIcon", () => {
  it("shows a lock icon and no animation while locked, regardless of rarity", () => {
    const { container } = renderIcon({ isLocked: true, rarity: "EXCLUSIVE" });

    const icon = container.firstElementChild;
    expect(icon).not.toBeNull();
    expect(icon?.className).not.toMatch(/animate-badge-/);
  });

  it("applies no animation for common and uncommon badges by default", () => {
    const { container: common } = renderIcon({ rarity: "COMMON" });
    const { container: uncommon } = renderIcon({ rarity: "UNCOMMON" });

    expect(common.firstElementChild?.className).not.toMatch(/animate-badge-/);
    expect(uncommon.firstElementChild?.className).not.toMatch(/animate-badge-/);
  });

  it.each([
    ["RARE", "animate-badge-glow"],
    ["EPIC", "animate-badge-shimmer"],
    ["LEGENDARY", "animate-badge-pulse"],
    ["EXCLUSIVE", "animate-badge-radiant"],
  ] as const)("defaults %s badges to %s when no animation is set", (rarity, expectedClass) => {
    const { container } = renderIcon({ rarity });

    expect(container.firstElementChild?.className).toContain(expectedClass);
  });

  it("lets an explicit designConfig.animation override the rarity default", () => {
    const { container } = renderIcon({
      rarity: "RARE",
      designConfig: { ...baseDesignConfig, animation: "none" },
    });

    expect(container.firstElementChild?.className).not.toMatch(/animate-badge-/);
  });

  it("lets an explicit designConfig.animation apply to a rarity with no default animation", () => {
    const { container } = renderIcon({
      rarity: "COMMON",
      designConfig: { ...baseDesignConfig, animation: "shimmer" },
    });

    expect(container.firstElementChild?.className).toContain("animate-badge-shimmer");
  });

  it("sets the badge glow custom property from the design config's color when animated", () => {
    const { container } = renderIcon({ rarity: "RARE" });

    const style = (container.firstElementChild as HTMLElement).style;
    expect(style.getPropertyValue("--badge-glow-color")).toBe("#f97316");
  });
});
