import { OUTFIT_SLOT_ICONS } from "@outfiqe/utils";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OUTFIT_SLOT_ICON_LABELS, OutfitSlotIcon } from "./outfit-slot-icon";

describe("OutfitSlotIcon", () => {
  it("draws every icon admins can pick", () => {
    for (const icon of OUTFIT_SLOT_ICONS) {
      const { container, unmount } = render(<OutfitSlotIcon icon={icon} />);
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });

  it("hides itself from screen readers unless it is given a label", () => {
    const { container } = render(<OutfitSlotIcon icon="dress" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    render(<OutfitSlotIcon icon="dress" label="Full Outfit" />);
    expect(screen.getByRole("img", { name: "Full Outfit" })).toBeInTheDocument();
  });

  it("falls back to a generic icon for a key it does not know", () => {
    const { container } = render(<OutfitSlotIcon icon="rocket" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("has a readable name for every icon", () => {
    for (const icon of OUTFIT_SLOT_ICONS) {
      expect(OUTFIT_SLOT_ICON_LABELS[icon].length).toBeGreaterThan(0);
    }
  });
});
