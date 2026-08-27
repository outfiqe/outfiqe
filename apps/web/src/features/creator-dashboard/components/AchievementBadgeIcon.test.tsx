import { AchievementBadgeIcon } from "@outfiqe/design-system";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BadgeDesignConfig, BadgeLayer, BadgeRarityValue } from "../api/badgeSchemas";

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

  const studioLayers: BadgeLayer[] = [
    {
      id: "bg",
      type: "background",
      shape: "circle",
      fill: "#1d4ed8",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
    {
      id: "icon",
      type: "icon",
      glyph: "⭐",
      fontSize: 50,
      x: 25,
      y: 10,
      width: 50,
      height: 50,
    },
    {
      id: "text",
      type: "text",
      content: "MVP",
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "bold",
      x: 10,
      y: 65,
      width: 80,
      height: 25,
    },
  ];

  it("renders a studio-designed badge's layers in stacking order", () => {
    const { container } = renderIcon({
      designConfig: { version: 2, layers: studioLayers },
    });

    const layersContainer = container.firstElementChild?.firstElementChild;
    const layerElements = Array.from(layersContainer?.children ?? []) as HTMLElement[];
    expect(layerElements).toHaveLength(3);
    expect(layerElements[0]?.style.backgroundColor).toBe("rgb(29, 78, 216)");
    expect(layerElements[1]?.textContent).toBe("⭐");
    expect(layerElements[2]?.textContent).toBe("MVP");
  });

  it("shows a lock icon instead of layers for a locked studio-designed badge", () => {
    const { container } = renderIcon({
      isLocked: true,
      designConfig: { version: 2, layers: studioLayers },
    });

    expect(container.textContent).not.toContain("MVP");
  });

  it("uses the studio background layer's fill for the badge glow color", () => {
    const { container } = renderIcon({
      rarity: "RARE",
      designConfig: { version: 2, layers: studioLayers },
    });

    const style = (container.firstElementChild as HTMLElement).style;
    expect(style.getPropertyValue("--badge-glow-color")).toBe("#1d4ed8");
  });

  const hasBackgroundImage = (element: Element | null, url: string) =>
    Boolean((element as HTMLElement | null)?.style.backgroundImage.includes(url));

  it("renders a simple design's imageUrl instead of the emoji", () => {
    const { container } = renderIcon({
      designConfig: {
        shape: "circle",
        primaryColor: "#f97316",
        imageUrl: "https://cdn.test/i.png",
      },
    });

    const imageLayer = container.querySelector("[style*='background-image']");
    expect(hasBackgroundImage(imageLayer, "https://cdn.test/i.png")).toBe(true);
    expect(container.textContent).not.toContain("🏆");
  });

  it("falls back to the emoji, not the image, while a badge with an imageUrl is locked", () => {
    const { container } = renderIcon({
      isLocked: true,
      designConfig: {
        shape: "circle",
        primaryColor: "#f97316",
        imageUrl: "https://cdn.test/i.png",
      },
    });

    expect(container.querySelector("[style*='background-image']")).toBeNull();
  });

  it("renders a studio image layer with the configured background-size", () => {
    const { container } = renderIcon({
      designConfig: {
        version: 2,
        layers: [
          ...studioLayers,
          {
            id: "photo",
            type: "image",
            url: "https://cdn.test/layer.png",
            fit: "cover",
            x: 10,
            y: 10,
            width: 80,
            height: 80,
          },
        ],
      },
    });

    const layersContainer = container.firstElementChild?.firstElementChild;
    const imageLayer = Array.from(layersContainer?.children ?? []).find((child) =>
      hasBackgroundImage(child, "https://cdn.test/layer.png"),
    ) as HTMLElement;
    expect(imageLayer).not.toBeUndefined();
    expect(imageLayer.style.backgroundSize).toBe("cover");
  });
});
